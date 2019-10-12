

function initModels(app) {
    let modelsPath = app.get('root') + '/src/models/';

    ['user']
        .forEach(function (model) {
            require(modelsPath + model);
        });
};

module.exports = Object.assign({}, {initModels});