module.exports = function(app){
    var PortfolioFW = Object.getPrototypeOf(app).PortfolioFW = new app.Component("portfolioFW");
    // PortfolioFW.debug = true;
    PortfolioFW.createdAt      = "2.4.0";
    PortfolioFW.lastUpdate     = "2.4.0";
    PortfolioFW.version        = "1";
    // PortfolioFW.factoryExclude = true;
    // PortfolioFW.loadingMsg     = "This message will display in the console when component will be loaded.";
    // PortfolioFW.requires       = [];

    // PortfolioFW.prototype.onCreate = function(){
    // do thing after element's creation
    // }
    return PortfolioFW;
}