export interface JwtPayload {
    sub: number;
    username: string;
    name: string;
    email: string;
    groups: number;
    vendors?: number | null;
    iat?: number;
    exp?: number;
}
