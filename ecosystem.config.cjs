/**
 * PM2 Ecosystem Configuration for YuanluVIP
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 reload ecosystem.config.cjs --env production
 *   pm2 stop YuanluVIP
 *   pm2 logs YuanluVIP
 */
module.exports = {
  apps: [
    {
      name: "YuanluVIP",
      script: "dist/server.cjs",
      cwd: "/var/www/YuanluVIP",

      // Environment variables
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Instance & cluster settings
      instances: 1,
      exec_mode: "fork",

      // Auto-restart on failure
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,

      // Memory limit auto-restart (512MB)
      max_memory_restart: "512M",

      // Logging
      error_file: "/var/www/YuanluVIP/logs/error.log",
      out_file: "/var/www/YuanluVIP/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Watch (disabled in production, use CI/CD for deploys)
      watch: false,
    },
  ],
};
