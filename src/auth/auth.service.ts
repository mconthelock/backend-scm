import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Users } from '../entities/table/users.entity.js';
import { UsersPassword } from '../entities/table/users-password.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
    private readonly revokedTokens = new Map<string, number>();

    constructor(
        @InjectRepository(Users, 'dbConnection')
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(UsersPassword, 'dbConnection')
        private readonly usersPasswordRepository: Repository<UsersPassword>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * เข้ารหัสรหัสผ่านด้วย MD5, SHA-256 หรือ SHA-512
     */
    hashPassword(
        password: string,
        algorithm?: 'md5' | 'sha256' | 'sha512',
    ): string {
        const envAlgo = this.configService
            .get<string>('PASSWORD_HASH_ALGO')
            ?.toLowerCase();
        const algo: 'md5' | 'sha256' | 'sha512' =
            algorithm ||
            (envAlgo === 'sha512' || envAlgo === 'md5' ? envAlgo : 'sha256');
        return createHash(algo).update(password).digest('hex');
    }

    /**
     * ตรวจสอบรหัสผ่านกับค่า Hash ในตาราง USERS_PASSWORD
     * รองรับทั้ง MD5 (32 ตัวอักษร), SHA-256 (64 ตัวอักษร) และ SHA-512 (128 ตัวอักษร) อัตโนมัติ
     */
    verifyPassword(plainPassword: string, storedHash: string): boolean {
        if (!storedHash) {
            return false;
        }
        const normalizedStored = storedHash.trim().toLowerCase();
        let algo: 'md5' | 'sha256' | 'sha512' = 'sha256';
        if (normalizedStored.length === 32) {
            algo = 'md5';
        } else if (normalizedStored.length === 128) {
            algo = 'sha512';
        }
        const computedHash = this.hashPassword(plainPassword, algo).toLowerCase();

        const bufA = Buffer.from(computedHash, 'utf8');
        const bufB = Buffer.from(normalizedStored, 'utf8');
        if (bufA.length !== bufB.length) {
            return false;
        }
        return timingSafeEqual(bufA, bufB);
    }

    /**
     * ตรวจสอบชื่อผู้ใช้งานและรหัสผ่านสำหรับ LocalStrategy
     */
    async validateUser(
        username: string,
        password: string,
    ): Promise<Users | null> {
        const user = await this.usersRepository.findOne({
            where: { USR_LOGIN: username },
        });

        if (!user) {
            return null;
        }

        if (user.USR_STATUS !== 1) {
            throw new ForbiddenException('บัญชีผู้ใช้งานถูกระงับการใช้งาน');
        }

        const userPassword = await this.usersPasswordRepository.findOne({
            where: { USERS: user.USR_ID },
        });

        if (
            !userPassword ||
            !this.verifyPassword(password, userPassword.PWD_CURRENT)
        ) {
            return null;
        }

        return user;
    }

    /**
     * ตรวจสอบข้อมูลผู้ใช้งานจาก JWT Payload สำหรับ JwtStrategy
     */
    async validateJwtPayload(payload: JwtPayload): Promise<Users | null> {
        const user = await this.usersRepository.findOne({
            where: { USR_ID: payload.sub },
        });

        if (!user || user.USR_STATUS !== 1) {
            return null;
        }

        return user;
    }

    /**
     * สร้าง JWT Access Token และอัปเดตเวลาเข้าสู่ระบบล่าสุด (USR_LASTLOGIN)
     */
    async login(user: Users) {
        const now = new Date();
        await this.usersRepository.update(
            { USR_ID: user.USR_ID },
            { USR_LASTLOGIN: now },
        );
        user.USR_LASTLOGIN = now;

        const payload: JwtPayload = {
            sub: user.USR_ID,
            username: user.USR_LOGIN,
            name: user.USR_NAME,
            email: user.USR_EMAIL,
            groups: user.GROUPS,
            vendors: user.VENDORS,
        };

        const expiresIn =
            this.configService.get<string>('JWT_EXPIRES_IN') || '1d';
        const accessToken = await this.jwtService.signAsync(payload);

        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
            user: this.sanitizeUser(user),
        };
    }

    /**
     * ลงทะเบียนผู้ใช้งานใหม่ลงในตาราง USERS และ USERS_PASSWORD
     */
    async register(registerDto: RegisterDto) {
        const existingUser = await this.usersRepository.findOne({
            where: { USR_LOGIN: registerDto.USR_LOGIN },
        });

        if (existingUser) {
            throw new ConflictException(
                'ชื่อผู้ใช้งาน (USR_LOGIN) นี้มีอยู่ในระบบแล้ว',
            );
        }

        const now = new Date();
        const newUser = this.usersRepository.create({
            USR_LOGIN: registerDto.USR_LOGIN,
            USR_NAME: registerDto.USR_NAME,
            USR_EMAIL: registerDto.USR_EMAIL,
            USR_PIC: registerDto.USR_PIC ?? null,
            USR_PIC_EMAIL: registerDto.USR_PIC_EMAIL ?? null,
            GROUPS: registerDto.GROUPS ?? 16,
            VENDORS: registerDto.VENDORS ?? null,
            PROD_ID: registerDto.PROD_ID ?? null,
            USR_STATUS: 1,
            USR_PDPA: 0,
            USR_REGISTDATE: now,
            USR_LASTUPDATE: now,
        });

        const savedUser = await this.usersRepository.save(newUser);

        const userPassword = this.usersPasswordRepository.create({
            USERS: savedUser.USR_ID,
            PWD_CURRENT: this.hashPassword(registerDto.password),
            PWD_PREVIOUS: null,
            PWD_UPDATEDATE: now,
        });

        await this.usersPasswordRepository.save(userPassword);

        return {
            message: 'สร้างบัญชีผู้ใช้งานสำเร็จ',
            user: this.sanitizeUser(savedUser),
        };
    }

    /**
     * เปลี่ยนรหัสผ่านและบันทึกรหัสผ่านเดิมไว้ใน PWD_PREVIOUS
     */
    async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
        const user = await this.usersRepository.findOne({
            where: { USR_ID: userId },
        });

        if (!user) {
            throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');
        }

        const userPassword = await this.usersPasswordRepository.findOne({
            where: { USERS: userId },
        });

        if (
            !userPassword ||
            !this.verifyPassword(
                changePasswordDto.currentPassword,
                userPassword.PWD_CURRENT,
            )
        ) {
            throw new UnauthorizedException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        }

        if (
            this.verifyPassword(
                changePasswordDto.newPassword,
                userPassword.PWD_CURRENT,
            )
        ) {
            throw new BadRequestException(
                'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน',
            );
        }

        const now = new Date();
        const newHashedPassword = this.hashPassword(
            changePasswordDto.newPassword,
        );

        userPassword.PWD_PREVIOUS = userPassword.PWD_CURRENT;
        userPassword.PWD_CURRENT = newHashedPassword;
        userPassword.PWD_UPDATEDATE = now;
        await this.usersPasswordRepository.save(userPassword);

        await this.usersRepository.update(
            { USR_ID: userId },
            {
                USR_RESETDATE: now,
                USR_LASTUPDATE: now,
            },
        );

        return {
            message: 'เปลี่ยนรหัสผ่านสำเร็จ',
        };
    }

    /**
     * ดึงข้อมูลโปรไฟล์ของผู้ใช้งานปัจจุบัน
     */
    async getProfile(userId: number) {
        const user = await this.usersRepository.findOne({
            where: { USR_ID: userId },
        });

        if (!user) {
            throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');
        }

        return this.sanitizeUser(user);
    }

    /**
     * ออกจากระบบและเพิกถอน JWT Token ปัจจุบัน
     */
    logout(token?: string) {
        if (token) {
            this.cleanupExpiredTokens();
            const decoded = this.jwtService.decode(token) as JwtPayload | null;
            const expMs = decoded?.exp
                ? decoded.exp * 1000
                : Date.now() + 24 * 60 * 60 * 1000;
            this.revokedTokens.set(token, expMs);
        }

        return {
            message: 'ออกจากระบบสำเร็จ',
        };
    }

    /**
     * ตรวจสอบว่า Token ถูกเพิกถอนแล้วหรือไม่
     */
    isTokenRevoked(token: string): boolean {
        this.cleanupExpiredTokens();
        return this.revokedTokens.has(token);
    }

    private cleanupExpiredTokens() {
        const now = Date.now();
        for (const [token, expMs] of this.revokedTokens.entries()) {
            if (expMs <= now) {
                this.revokedTokens.delete(token);
            }
        }
    }

    private sanitizeUser(user: Users) {
        return {
            USR_ID: user.USR_ID,
            USR_LOGIN: user.USR_LOGIN,
            USR_NAME: user.USR_NAME,
            USR_EMAIL: user.USR_EMAIL,
            USR_STATUS: user.USR_STATUS,
            GROUPS: user.GROUPS,
            VENDORS: user.VENDORS,
            PROD_ID: user.PROD_ID,
            USR_PIC: user.USR_PIC,
            USR_PIC_EMAIL: user.USR_PIC_EMAIL,
            USR_PDPA: user.USR_PDPA,
            USR_REGISTDATE: user.USR_REGISTDATE,
            USR_RESETDATE: user.USR_RESETDATE,
            USR_LASTLOGIN: user.USR_LASTLOGIN,
            USR_LASTUPDATE: user.USR_LASTUPDATE,
        };
    }
}
