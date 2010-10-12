/*
 * jQuery browserEvent - Plugin for passing events to other browser windows running the same page
 * 
 * Authors: Rodney Rehm
 * Documentation: http://code.medialize.de/jQuery/store/
 * 
 * Licensed under the MIT License:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 */

/*
 * No, this utility has got nothing in common with window.postMessage() and EventSource
 * 	http://dev.w3.org/html5/postmsg/
 * 	http://dev.w3.org/html5/eventsource/
 */

(function($,undefined){

var _store = null,
	_winStore = null,
	browserEvent = {
	ident: null,
	identPattern: /^browserEvent_([0-9]+)$/,

	pollInterval: 200,
	_pollInterval: null,
	
	reqistered: [],
	reqisteredHash: null,
	sendQueue: [],
	flushingQueue: true, // wait for ready

	registerChecks: 3,
	registerChecksDone: 0,
	
	bind: function( event, callback )
	{
		$( window )[ $.fn.bindDetached ? 'bindDetached' : 'bind' ]( event, callback );
	},
	
	unbind: function( event )
	{
		$( window ).unbind( event );
	},

	trigger: function( event, data )
	{
		this.sendQueue.push( { event:event, data:data } );
		if( !this.flushingQueue )
			this.flushQueue();
	},
	
	flushQueue: function()
	{
		// TODO: acquire lock
		
		// send queue
		var that = this;
		if( this.registered && this.registered.length )
		{
			$.each( this.registered, function( i, win )
			{
				if( win == that.ident )
					return true; // continue;
			
				var queue = _store.get( win ) || [];
		
				queue = queue.concat( that.sendQueue );
				_store.set( win, queue );
			});
		}
		
		// clean queue
		this.sendQueue = [];
		this.flushingQueue = false;
	},
	
	poll: function()
	{
		var events = _store.get( this.ident );
		if( events === null || events.length == undefined )
		{
			events = [];
			_store.set( this.ident, [] );
		}
		
		// dispatch browser events
		if( events && events.length )
		{
			_store.set( this.ident, [] );
			$.each( events, function()
			{
				$( window ).trigger( this.event, [this.data] );
			});
		}
		
		// load registered windows
		var registered = _store.get( 'browserEventRegister' ) || [],
			registeredHash = registered.join( '#' );
		
		// update registered windows
		if( registeredHash != this.registeredHash )
		{
			this.registered = registered;
			this.registeredHash = registeredHash;
			$( window ).trigger( 'browserWindows', [this.registered] );
		}
	},

	register: function()
	{
		var register = _store( 'browserEventRegister' );
		if( !register )
			register = [];

		var that = this,
			registered = false;

		$.each( register, function( key, value ){
			if( value == that.ident )
			{
				registered = true;
				return false; // break;
			}
		});
		
		if( registered )
		{
			if( this.registerChecksDone++ > this.registerChecks )
			{
				this.ready();
				return;
			}
		}
		else
		{
			this.registerChecksDone = 0;
			register.push( this.ident );
			register[ this.ident ] = 1;
		
			_store( 'browserEventRegister', register );
		}
		
		// check that the register is still available
		var that = this;
		window.setTimeout( function()
		{
			that.register.call( that );
		}, Math.ceil( Math.random() * 100 ) );
	},

	ready: function()
	{
		// run poller
		this.poll();
		
		// send events that queued up during init
		if( this.sendQueue.length )
			this.flushQueue();
		else
			this.flushingQueue = false;

		// activate poller
		var that = this;
		this._pollInterval = window.setInterval( function(){ that.poll.call( that ); }, this.pollInterval );
		
		$.browserEvent.ready.call( $.browserEvent );
	},

	init: function( storage, winStorage )
	{
		// abort if storage is incapable of inter-window communication
		if( !storage || storage.driver.scope != "browser" )
			return;
		
		_store = storage;
		_winStore = winStorage;
		
		// identify this window
		if( !this.ident )
		{
			// save ident in window.name to keep accross document changes
			this.ident = _winStore.get( 'browserEventIdent' );
			if( !this.ident.match( this.identPattern ) )
				this.ident = 'browserEvent_' + Math.floor((new Date).getTime() + Math.random() * 10000 );
			
			_winStore.set( 'browserEventIdent', this.ident );
		}
		
		// register this window
		this.register();
	}
};

$.browserEvent = function( event, callback )
{
	if( callback != undefined && !$.isFunction( callback ) )
		browserEvent.bind( event, callback );
	else
		browserEvent.trigger( event, callback );
};

$.extend( $.browserEvent, {
	ready: $.noop,
	init: function(){ 
		browserEvent.init(); 
		return $.browserEvent;
	},
	bind: function( event, callback )
	{ 
		browserEvent.bind( event, callback ); 
		return $.browserEvent;
	},
	unbind: function( event )
	{ 
		browserEvent.unbind( event ); 
		return $.browserEvent;
	},
	trigger: function( event, data )
	{ 
		browserEvent.trigger( event, data ); 
		return $.browserEvent;
	},
	ident: function()
	{ 
		return browserEvent.ident 
	}
});

})(jQuery);