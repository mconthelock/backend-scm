import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, {
    Transporter,
    SendMailOptions as NodemailerSendMailOptions,
} from 'nodemailer';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface SendMailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: NodemailerSendMailOptions['attachments'];
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: Transporter;
    private templatesDir: string;
    private assetsDir: string;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('MAIL_HOST') || 'localhost';
        const port = Number(
            this.configService.get<number>('MAIL_PORT') || 1025,
        );
        const user = this.configService.get<string>('MAIL_USER');
        const pass = this.configService.get<string>('MAIL_PASSWORD');

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: user && pass ? { user, pass } : undefined,
            ignoreTLS: port === 1025,
        });

        const currentDir = dirname(fileURLToPath(import.meta.url));
        this.templatesDir = join(currentDir, 'templates', 'html');
        this.assetsDir = join(currentDir, 'assets');
    }

    async renderTemplate(
        templateName: string,
        variables: Record<string, string>,
    ): Promise<string> {
        const filePath = join(this.templatesDir, templateName);
        let content = await fs.readFile(filePath, 'utf-8');

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(regex, value ?? '');
        }

        return content;
    }

    async sendMail(options: SendMailOptions): Promise<void> {
        const from =
            this.configService.get<string>('MAIL_FROM') ||
            '"AMEC SCM System" <noreply@amec.co.th>';

        try {
            await this.transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments,
            });
            this.logger.log(`Email sent successfully to ${options.to}`);
        } catch (error) {
            this.logger.error(
                `Failed to send email to ${options.to}: ${(error as Error).message}`,
                (error as Error).stack,
            );
        }
    }

    async sendPasswordResetEmail(
        to: string,
        username: string,
        resetToken: string,
    ): Promise<void> {
        const frontendUrl =
            this.configService.get<string>('FRONTEND_URL') ||
            'http://localhost:8080/scm';
        const resetLink = `${frontendUrl}/auth/reset_credentials?token=${resetToken}`;
        const expiresIn =
            this.configService.get<string>('RESET_PASSWORD_EXPIRES_IN') ||
            '15m';

        const subject = '[AMEC SCM] คำขอรีเซ็ตรหัสผ่านของคุณ';
        const text = `เรียนคุณ ${username},\n\nระบบได้รับคำขอรีเซ็ตรหัสผ่านสำหรับระบบ AMEC SCM\nกรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ ${expiresIn}):\n${resetLink}\n\nหากคุณไม่ได้เป็นผู้ร้องขอ โปรดละเว้นอีเมลฉบับนี้`;

        const nowFormatted = new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        let html: string;
        try {
            html = await this.renderTemplate('forgot-password.html', {
                RECIPIENT_NAME: username,
                USERNAME: username,
                RESET_LINK: resetLink,
                EXPIRES_IN: expiresIn,
                REQUEST_TIME: nowFormatted,
            });
        } catch (err) {
            this.logger.warn(
                `Template render fallback: ${(err as Error).message}`,
            );
            html = `<p>สวัสดีคุณ ${username}</p><p>ลิงก์รีเซ็ตรหัสผ่าน: <a href="${resetLink}">${resetLink}</a></p>`;
        }

        const logoPath = join(this.assetsDir, 'mitsubishi-logo.png');

        await this.sendMail({
            to,
            subject,
            text,
            html,
            attachments: [
                {
                    filename: 'mitsubishi-logo.png',
                    path: logoPath,
                    cid: 'brand-logo',
                },
            ],
        });
    }
}
