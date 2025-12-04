module.exports = {
  apps: [
    {
      name: 'coursecompass-v2',
      script: 'server.ts',
      interpreter: 'tsx',
      cwd: './',
      instances: 1, // or 'max' for cluster mode
      exec_mode: 'fork', // or 'cluster' for multiple instances
      watch: false, // Set to true for development
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        watch: true
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};