/**
 * jquery.gridrotator.js v1.1.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2012, Codrops
 * http://www.codrops.com
 */
;( function( $, window, undefined ) {
	
	'use strict';

	/*
	* debouncedresize: special jQuery event that happens once after a window resize
	*
	* latest version and complete README available on Github:
	* https://github.com/louisremi/jquery-smartresize/blob/master/jquery.debouncedresize.js
	*
	* Copyright 2011 @louis_remi
	* Licensed under the MIT license.
	*/
	var $event = $.event,
	$special,
	resizeTimeout;

	$special = $event.special.debouncedresize = {
		setup: function() {
			$( this ).on( "resize", $special.handler );
		},
		teardown: function() {
			$( this ).off( "resize", $special.handler );
		},
		handler: function( event, execAsap ) {
			// Save the context
			var context = this,
				args = arguments,
				dispatch = function() {
					// set correct event type
					event.type = "debouncedresize";
					$event.dispatch.apply( context, args );
				};

			if ( resizeTimeout ) {
				clearTimeout( resizeTimeout );
			}

			execAsap ?
				dispatch() :
				resizeTimeout = setTimeout( dispatch, $special.threshold );
		},
		threshold: 100
	};

	// http://www.hardcode.nl/subcategory_1/article_317-array-shuffle-function
	Array.prototype.shuffle = function() {
		var i=this.length,p,t;
		while (i--) {
			p = Math.floor(Math.random()*i);
			t = this[i];
			this[i]=this[p];
			this[p]=t;
		}
		return this;
	};

	// HTML5 PageVisibility API
	// http://www.html5rocks.com/en/tutorials/pagevisibility/intro/
	// by Joe Marini (@joemarini)
	function getHiddenProp(){
		var prefixes = ['webkit','moz','ms','o'];

		// if 'hidden' is natively supported just return it
		if ('hidden' in document) return 'hidden';

		// otherwise loop over all the known prefixes until we find one
		for (var i = 0; i < prefixes.length; i++){
			if ((prefixes[i] + 'Hidden') in document) 
				return prefixes[i] + 'Hidden';
		}

		// otherwise it's not supported
		return null;
	}
	function isHidden() {
		var prop = getHiddenProp();
		if (!prop) return false;

		return document[prop];
	}

	function isEmpty( obj ) {
		return Object.keys(obj).length === 0;
	}

	// global
	var $window = $( window ),
		Modernizr = window.Modernizr;

	$.GridRotator = function( options, element ) {
		
		this.$el = $( element );
		if( Modernizr.backgroundsize ) {

			var self = this;
			this.$el.addClass( 'ri-grid-loading' );
			this._init( options );

		}		
	};

	// the options
	$.GridRotator.defaults = {
		// number of rows
		rows : 1,
		// number of columns 
		columns : 10,
		w1024 : { rows : 4, columns : 8 },
		w768 : {rows : 3,columns : 7 },
		w480 : {rows : 3,columns : 5 },
		w320 : {rows : 2,columns : 4 },
		w240 : {rows : 2,columns : 3 },
		
		
	};

	$.GridRotator.prototype = {

		_init : function( options ) {
			
			// options
			this.options = $.extend( true, {}, $.GridRotator.defaults, options );
			// cache some elements + variables
			this._config();

		},
		_config : function() {

			var self = this,
				transEndEventNames = {
					'WebkitTransition' : 'webkitTransitionEnd',
					
				};			
			this.transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ] + '.gridrotator';			

			// the <ul> where the items are placed
			this.$list = this.$el.children( 'ul' );
			// remove images and add background-image to anchors
			// preload the images before
			var loaded = 0,
				$imgs = this.$list.find( 'img' ),
				count = $imgs.length;

			$imgs.each( function() {

				var $img = $( this ), src = $img.attr( 'src' );

				$( '<img/>' ).load( function() {

					++loaded;
					$img.parent().css( 'background-image', 'url(' + src + ')' );

					if( loaded === count ) {

						$imgs.remove();
						self.$el.removeClass( 'ri-grid-loading' );
						// the items
						self.$items = self.$list.children( 'li' );
						// make a copy of the items
						self.$itemsCache = self.$items.clone();
						// total number of items
						self.itemsTotal = self.$items.length;
						// the items that will be out of the grid
						// actually the item's child (anchor element)
						self.outItems= [];
						self._layout( function() {
							self._initEvents();
						} );						
					}

				} ).attr( 'src', src )
				 
			} );

		},
		_layout : function( callback ) {

			var self = this;

			// sets the grid dimentions based on the container's width
			this._setGridDim();

			// reset
			this.$list.empty();
			this.$items = this.$itemsCache.clone().appendTo( this.$list );
			
			var $outItems = this.$items.filter( ':gt(' + ( this.showTotal - 1 ) + ')' ),
				$outAItems = $outItems.children( 'a' );

			this.outItems.length = 0;

			$outAItems.each( function( i ) {
				self.outItems.push( $( this ) );
			} );

			$outItems.remove();

				// container's width
			var containerWidth = ( document.defaultView ) ? parseInt( document.defaultView.getComputedStyle( this.$el.get( 0 ), null ).width ) : this.$el.width(),
				// item's width
				itemWidth = Math.floor( containerWidth / this.columns ),
				// calculate gap
				gapWidth = containerWidth - ( this.columns * Math.floor( itemWidth ) );

			for( var i = 0; i < this.rows; ++i ) {

				for( var j = 0; j < this.columns; ++j ) {

					var idx = this.columns * i + j,
						$item = this.$items.eq( idx );

					$item.css( {
						width : j < Math.floor( gapWidth ) ? itemWidth + 1 : itemWidth,
						height : itemWidth
					} );					

				}

			}

			if( this.options.preventClick ) {

				this.$items.children().css( 'cursor', 'default' ).on( 'click.gridrotator', true );

			}

			if( callback ) {
				callback.call();
			}

		},
		// set the grid rows and columns
		_setGridDim	 : function() {

			// container's width
			var c_w = this.$el.width();

			// we will choose the number of rows/columns according to the container's width and the values set in the plugin options 
			switch( true ) {
				case ( c_w < 240 ) : this.rows = this.options.w240.rows; this.columns = this.options.w240.columns; break;
				case ( c_w < 320 ) : this.rows = this.options.w320.rows; this.columns = this.options.w320.columns; break;
				case ( c_w < 480 ) : this.rows = this.options.w480.rows; this.columns = this.options.w480.columns; break;
				case ( c_w < 768 ) : this.rows = this.options.w768.rows; this.columns = this.options.w768.columns; break;
				case ( c_w < 1024 ) : this.rows = this.options.w1024.rows; this.columns = this.options.w1024.columns; break;
				default : this.rows = this.options.rows; this.columns = this.options.columns; break;
			}

			this.showTotal = this.rows * this.columns;

		},
		// init window resize event
		_initEvents : function() {

			var self = this;

			$window.on( 'debouncedresize.gridrotator', function() {
				self._layout();
			} );			
					
		},
															
	};
	
	var logError = function( message ) {

		if ( window.console ) {

			window.console.error( message );
		
		}

	};
	
	$.fn.gridrotator = function( options ) {

		var instance = $.data( this, 'gridrotator' );
		
		if ( typeof options === 'string' ) {
			
			var args = Array.prototype.slice.call( arguments, 1 );
			
			this.each(function() {
			
				if ( !instance ) {

					logError( "cannot call methods on gridrotator prior to initialization; " +
					"attempted to call method '" + options + "'" );
					return;
				
				}
				
				if ( !$.isFunction( instance[options] ) || options.charAt(0) === "_" ) {

					logError( "no such method '" + options + "' for gridrotator instance" );
					return;
				
				}
				
				instance[ options ].apply( instance, args );
			
			});
		
		} 
		else {
		
			this.each(function() {
				
				if ( instance ) {

					instance._init();
				
				}
				else {

					instance = $.data( this, 'gridrotator', new $.GridRotator( options, this ) );
				
				}

			});
		
		}
		
		return instance;
		
	};
	
} )( jQuery, window );



//sidebar floating

$(window).scroll(function(){
var wScroll = $(this).scrollTop();
	
	$('.item-view .sidebar-container').css({
		'transform' : 'translate(0px,'+ wScroll/2 +'%)'
	
}); 




















