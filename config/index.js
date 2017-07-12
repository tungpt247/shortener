module.exports = {
  development: {
    db: {
      host: 'mongo',
      port: 27017,
      database: 'shortener_dev'
    }
  },
  production: {
    db: {
      host: 'mongo',
      port: 27017,
      database: 'shortener_prod'
    }
  }
}