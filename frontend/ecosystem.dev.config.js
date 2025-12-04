module.exports = {
  apps: [
    {
      name: 'coursecompass-dev',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      watch: true,
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '.next',
        'tests'
      ],
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/dev-err.log',
      out_file: './logs/dev-out.log',
      log_file: './logs/dev-combined.log',
      time: true
    }
  ]
};