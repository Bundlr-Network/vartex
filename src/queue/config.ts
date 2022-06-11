export const REDIS_CONFIG = {
    redis: {
        host: process.env.REDIS_HOST,
        port: +process.env.REDIS_PORT,
        username: process.env.REDIS_USER,
        password: process.env.REDIS_PASSWORD,
    },
};