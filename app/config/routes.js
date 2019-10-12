
function initRoutes(app) {
    let routesPath = app.get('root') + '/src/routes';

    app.use('/api', require(routesPath + '/auth'));
    
};

module.exports = Object.assign({}, {initRoutes})
