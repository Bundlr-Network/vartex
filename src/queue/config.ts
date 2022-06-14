export const MQ_REDIS_CONFIG = {
    connection: {
        redis: {
            host: process.env.REDIS_HOST ?? "localhost",
            port: +(process.env.REDIS_PORT ?? 6379),
            username: process.env.REDIS_USER,
            password: process.env.REDIS_PASSWORD,
        }
    },
};