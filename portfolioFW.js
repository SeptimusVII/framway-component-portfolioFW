module.exports = function(app){
    var PortfolioFW = Object.getPrototypeOf(app).PortfolioFW = new app.Component("portfolioFW");
    // PortfolioFW.debug = true;
    PortfolioFW.createdAt      = "2.4.0";
    PortfolioFW.lastUpdate     = "2.4.0";
    PortfolioFW.version        = "1.1";
    PortfolioFW.factoryExclude = true;
    // PortfolioFW.loadingMsg     = "This message will display in the console when component will be loaded.";
    // PortfolioFW.requires       = [];

    PortfolioFW.prototype.onCreate = function(){
        var portfolio = this;
        portfolio.$el.addClass('loading');

        portfolio.$reader = $(`
            <div class="portfolioFW__reader">
            <div class="details"><i class="fas fa-info-circle"></i></div>
            <div class="counter"><span class="actual"></span> / <span class="total"></span></div>
            <div class="close"><i class="fas fa-times"></i></div>
            <div class="nav_item prev"><i class="fas fa-chevron-left"></i></div>
            <div class="nav_item next"><i class="fas fa-chevron-right"></i></div>
            <div class="wrapper"></div>
            </div>
            `).insertAfter(portfolio.$el);
        portfolio.$links    = portfolio.$el.find('.portfolioFW__link');
        portfolio.$wrapper  = portfolio.$reader.find('.wrapper');
        portfolio.$counter  = portfolio.$reader.find('.counter');
        portfolio.activeID  = 0;
        portfolio.hasBeenActivated = false;
        portfolio.items = [];
        portfolio.itemsAvailable = [];
        portfolio.timerResize = null;
        portfolio.getItemsWithAjax = (portfolio.getItemsWithAjax !== undefined) ? portfolio.getItemsWithAjax : portfolio.getData('ajax-getitems',false);
        portfolio.url = (portfolio.url !== undefined) ? portfolio.url : portfolio.getData('url','portfolio.html');
        portfolio.$loader  = $('<div class="loader"><i class="fad fa-spinner-third fa-spin"></i></div>').appendTo(portfolio.$el);

        portfolio.$links.children('a').on('click',function(e){e.preventDefault();});
        portfolio.$links.on('click',function(e){
            if (portfolio.getItem($(this).attr('data-id')))
                portfolio.open(portfolio.getItem($(this).attr('data-id')));
            else
                throw new Error('Can\'t find Portfolio\'s item with ID: '+$(this).attr('data-id'));
        });

        
        var initItems;
        if (portfolio.getItemsWithAjax) {
            // get items and store them
            initItems = portfolio.ajax_getItems();
        } else {
            initItems = Promise.resolve();
        }

        initItems.then(function(){
            if(PortfolioFW.debug) portfolio.log('initItems ended');
            portfolio.$wrapper.append($('.portfolioFW__item'));
            $('.portfolioFW__item').each(function (index, item) {
                portfolio.items.push(
                    new app.PortfolioFWItem({
                        $el: $(item),
                        reader:portfolio
                    })
                );
            });
            // set the array of the available items, by default all of them
            portfolio.setItemsAvailable(portfolio.items.map(function (item) {
                return item.id;
            }));

            // events
            portfolio.$reader.children('.close').on('click', function(){
                portfolio.close();
            });
            portfolio.$reader.find('.gallery,.content>.close').on('click', function(){
                portfolio.closeDetails();
            });
            portfolio.$reader.find('.details').on('click mouseenter', function () {
                portfolio.getItem(portfolio.activeID).openDetails();
            });
            portfolio.$reader.find('.nav_item.prev,.nav_item.next').on('click', function () {
                if (!$(this).hasClass('disabled')) {
                    var direction = 1;
                    if ($(this).hasClass('prev')) 
                        direction = -1;
                    var targetItem = portfolio.getItem(portfolio.itemsAvailable[portfolio.itemsAvailable.indexOf(portfolio.activeID) + direction]);
                    portfolio.open(targetItem);
                } else {
                    portfolio.$wrapper.addClass('animated');
                    setTimeout(function () {
                        portfolio.$wrapper.removeClass('animated');
                    }, 400);
                }
            });
            $(document).on('keyup', function(e){
                portfolio.keyEvents(e);
            });
            // if($('body').hasClass('mobile')){  // uncomment to limit swipe to mobile devices
            portfolio.swipeRef = new Hammer(portfolio.$reader.get(0),{
                cssProps:{
                    userSelect: 'none',
                    userDrag: 'none',
                }
            });
            portfolio.swipeRef.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
            portfolio.bindSwipe('reader');
            // } // uncomment to limit swipe to mobile devices

            $(window).resize(function(){portfolio.onResize()});

            // setTimeout(function(){portfolio.open(portfolio.getItem(62))},2000); // comment on production
            portfolio.$el.removeClass('loading').addClass('loaded');

            // detect if we are on the root url of the potfolio. If not, we are probably requesting to open the reader with an alias
            if(window.location.href.indexOf(portfolio.url) == -1 &&  window.location.href.indexOf(portfolio.url.replace('.html','/')) != -1 ){
                try{
                    var alias =  window.location.href.split(portfolio.url.replace('.html','')+'/')[1].split('?')[0].replace('.html','');
                    portfolio.open( portfolio.items.find(function (item) {return String(item.alias) === alias; }));
                } catch(e){
                    throw new Error('failed to retrieve portfolio item with alias "'+alias+'"');
                }
            }

            return portfolio;
        }).catch(function(error){
            throw error;
        });
    }
    PortfolioFW.prototype.open = function(item){
        var portfolio = this;
        if(PortfolioFW.debug) portfolio.log('reader opened');
        // init state
        if (portfolio.getItem(portfolio.activeID))
            portfolio.getItem(portfolio.activeID).stopGallery();
        portfolio.activeID = item.id;
        portfolio.closeDetails();
        $('body,html').scrollTop($(window).scrollTop()+1);
        $('html').addClass('overflow-hidden');
        portfolio.$reader.addClass('active');
        portfolio.$reader.find('.portfolioFW__item').removeClass('active');
        item.$el.addClass('active');

        var newUrl = new URL(window.location.href);
        newUrl.pathname = portfolio.url.replace('.html','/'+item.alias+'.html');
        window.history.replaceState({},"",newUrl);

        // navigation management
        portfolio.$reader.find('.nav_item').removeClass('disabled');
        if (portfolio.itemsAvailable.indexOf(item.id) <= 0) portfolio.$reader.find('.nav_item.prev').addClass('disabled');
        if (portfolio.itemsAvailable.indexOf(item.id) >= portfolio.itemsAvailable.length - 1) portfolio.$reader.find('.nav_item.next').addClass('disabled');
        if (!portfolio.hasBeenActivated) {
            portfolio.hasBeenActivated = true;
            setTimeout(function(){
                item.openDetails();
            },1000);
        }
        // update counter readout
        portfolio.$counter.find('.actual').text(portfolio.itemsAvailable.indexOf(portfolio.activeID) + 1);

        // MOVE-THE-BUS !!
        portfolio.navigate();
        item.runGallery();
    };
    PortfolioFW.prototype.navigate = function(){
        var portfolio = this;
        portfolio.$wrapper.addClass('animated').css('left', viewport.width * portfolio.itemsAvailable.indexOf(portfolio.activeID) * -1).one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function (e) {
            $(this).removeClass('animated');
        });
    };
    PortfolioFW.prototype.close = function(){
        var portfolio = this;
        $('html').removeClass('overflow-hidden');
        portfolio.$reader.removeClass('active');
        portfolio.$reader.find('.portfolioFW__item').removeClass('active');
        portfolio.closeDetails();
        if (portfolio.getItem(portfolio.activeID)) 
            portfolio.getItem(portfolio.activeID).stopGallery();

        var newUrl = new URL(window.location.href);
        newUrl.pathname = portfolio.url;
        window.history.replaceState({},"",newUrl);
    };
    PortfolioFW.prototype.closeDetails = function(){
        var portfolio = this;
        portfolio.bindSwipe('reader');
        portfolio.$reader.find('.portfolioFW__item .content').removeClass('active');
    };
    PortfolioFW.prototype.keyEvents = function(event){
        var portfolio = this;
        switch (event.which) {
        // left
        case 37: 
            portfolio.$reader.find('.nav_item.prev').trigger('click'); break;
        // right
        case 39: 
            portfolio.$reader.find('.nav_item.next').trigger('click'); break;
        // up
        case 38: 
            portfolio.getItem(portfolio.activeID).gallery.$nav.find('.item.active').prev('.item').trigger('click', true); break;
        // down
        case 40: 
            portfolio.getItem(portfolio.activeID).gallery.$nav.find('.item.active').next('.item').trigger('click', true); break;
        // exit this handler for other keys
        default: return;
        }
        event.preventDefault();
    };
    PortfolioFW.prototype.bindSwipe = function(mode){
        var portfolio = this;
        if(portfolio.swipeRef){
            portfolio.swipeRef.off('swipeleft swiperight swipeup swipedown');
            if(mode == "reader"){
                portfolio.swipeRef.on('swipeleft swiperight swipeup swipedown', function (ev) {
                    switch(ev.type){
                    case 'swipeleft':
                        portfolio.$reader.find('.nav_item.next').trigger('click'); break;
                    case 'swiperight':
                        portfolio.$reader.find('.nav_item.prev').trigger('click'); break;
                    case 'swipeup':
                        portfolio.getItem(portfolio.activeID).gallery.$nav.find('.item.active').next('.item').trigger('click', true); break;
                    case 'swipedown':
                        portfolio.getItem(portfolio.activeID).gallery.$nav.find('.item.active').prev('.item').trigger('click', true); break;
                    default: break;
                    }
                });
            } else if(mode == "detail"){
                portfolio.swipeRef.on('swipeleft swiperight swipeup swipedown', function (ev) {
                    switch(ev.type){
                    case 'swipeleft':
                        portfolio.closeDetails(); break;
                    case 'swiperight':
                    case 'swipeup':
                    case 'swipedown':
                    default: break;
                    }
                });
            }
        }
    };
    
    PortfolioFW.prototype.ajax_getItems = function(){
        var portfolio = this;
        return new Promise(function(resolve,reject){
            var payload = {
                'TL_AJAX':1,
                'moduleId': portfolio.getData('ajax-moduleid',0),
                'REQUEST_TOKEN': portfolio.getData('ajax-rt',0),
                'action': 'getItems',
                'template': portfolio.getData('ajax-templateitems',0),
            };
            if (portfolio.getData('ajax-param-category',false))
                payload.categories = [portfolio.getData('ajax-param-category','')];
            // console.log(payload);
            $.ajax({
                timeout: 10000,
                url: window.location.pathname,
                method: 'post',
                data:payload,
            }).done(function(data){
                if (typeof data !== 'object')
                    try{ data = $.parseJSON(data); } catch(e){throw e;}
                    // console.log(data);
                if (data.status == "success"){
                    for(var html of data.html){
                        portfolio.$wrapper.append(html);
                    }
                    resolve();
                } else {
                    throw data.msg
                }
            }).fail(function(jqXHR, textStatus){
                reject('getItems request failed with status '+jqXHR.status+': '+textStatus);
            });
        });
    };

    PortfolioFW.prototype.onResize = function(){
        var portfolio = this;
        clearTimeout(portfolio.timerResize);
        portfolio.timerResize = setTimeout(function () {
            portfolio.navigate();
        }, 500);
    };
    PortfolioFW.prototype.getItem = function(itemID){
        var portfolio = this;
        itemID = String(itemID);
        return portfolio.items.find(function (item) {
            return String(item.id) === itemID;
        });
    };
    PortfolioFW.prototype.setItemsAvailable = function(arrItems){
        var portfolio = this
        portfolio.itemsAvailable = arrItems;
        // update counter readout
        portfolio.$counter.find('.total').text(portfolio.itemsAvailable.length);
        portfolio.$wrapper.find('.portfolioFW__item').removeClass('hidden');
        $.each(portfolio.items, function (index, item) {
            if (portfolio.itemsAvailable.indexOf(item.id) == -1) item.$el.addClass('hidden');
        });
        return portfolio;
    };
    return PortfolioFW;
}