module.exports = {
  apps: [{
    name: 'zeshoo-md-bot',
    script: './index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    restart_delay: 5000,
    exp_backoff_restart_delay: 100,
    max_restarts: 50,
    min_uptime: '10s',
    kill_timeout: 10000,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true
  }]
};
