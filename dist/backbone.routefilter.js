/*! backbone.routefilter - v0.1.0 - 2012-12-13
* https://github.com/boazsender/backbone.routefilter
* Copyright (c) 2012 Boaz Sender; Licensed MIT */

/*! backbone.routefilter - v0.1.0 - 2012-08-29
* https://github.com/boazsender/backbone.routefilter
* Copyright (c) 2012 Boaz Sender; Licensed MIT */
/*global Backbone:false, _: false, console: false*/

;(function(Backbone, _) {
  // Parse querystring to a hash map
  var parseQueryParam = function(urlHash) {
    var
        param = {},
        querydata = urlHash.match(/[^?]*\?(.*)/),
        querystring_parser = /(?:^|&)([^&=]*)=?([^&]*)/g

    if (!querydata) { return param }

    querydata[1].replace(querystring_parser, function($0, $1, $2) {
      if ($1) { param[decodeURIComponent($1)] = decodeURIComponent($2) }
    })

    return param
  }

  var
      originalGetHash = Backbone.History.prototype.getHash,
      originalGetFragment = Backbone.History.prototype.getFragment,
      originalNavigate = Backbone.History.prototype.navigate

  _.extend(Backbone.History.prototype, {
    // Ignore the last question mark in fragment
    _processHash: function(hash) {
      var match = hash.match(/^(.*)\?/)
      return match ? match[1] : hash
    },
    getHash: function() {
      return this._processHash(originalGetHash.apply(this, arguments))
    },
    getFragment: function() {
      return this._processHash(originalGetFragment.apply(this, arguments))
    },

    navigate: function(fragment, options) {
      if (!Backbone.History.started) { return false }
      if (!options || options === true) { options = {trigger: options} }
      var _queryData = _(parseQueryParam(fragment)),
        currQueryData = parseQueryParam(window.location.href)

      if (
        // In hash change case
        this._wantsHashChange &&
        // Query param should exist
        !_queryData.isEqual({}) &&
        // Query param should different
        !_queryData.isEqual(currQueryData)
      ) {
        this.fragment = this.getFragment(fragment)
        this._updateHash(window.location, fragment, options.replace)
        this._updateIframeHash(fragment)
        if (options.trigger) { this.loadUrl(fragment) }
        return
      }

      originalNavigate.apply(this, arguments)
    },

    _updateIframeHash: function(fragment) {
      if (this.iframe) { return }
      var iframeHash = this.getHash(this.iframe)
      if (this.getFragment(fragment) !== this.getFragment(iframeHash)) {
        // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
        // When replace is true, we don't want this.
        if(!options.replace) { this.iframe.document.open().close() }
        this._updateHash(this.iframe.location, fragment, options.replace)
      }
    }
  })


  var
    // Save a reference to the original route method to be called
    // after we pave it over.
    originalRoute = Backbone.Router.prototype.route,

    // Create a reusable no operation func for the case where a before
    // or after filter is not set. Backbone or Underscore should have
    // a global one of these in my opinion.
    nop = function(){}

  // Extend the router prototype with a default before function,
  // a default after function, and a pave over of _bindRoutes.
  _.extend(Backbone.Router.prototype, {

    // Add default before filter.
    before: nop,

    // Add default after filter.
    after: nop,

    // Pave over Backbone.Router.prototype.route, the public method used
    // for adding routes to a router instance on the fly, and the
    // method which backbone uses internally for binding routes to handlers
    // on the Backbone.history singleton once it's instantiated.
    route: function(route, name, callback) {

      // If there is no callback present for this route, then set it to
      // be the name that was set in the routes property of the constructor,
      // or the name arguement of the route method invocation. This is what
      // Backbone.Router.route already does. We need to do it again,
      // because we are about to wrap the callback in a function that calls
      // the before and after filters as well as the original callback that
      // was passed in.
      if (!callback) { callback = this[name] }

      // Create a new callback to replace the original callback that calls
      // the before and after filters as well as the original callback
      // internally.
      var wrappedCallback = _.bind(function() {
        var
            param = parseQueryParam(window.location.hash),
            // Route option name will be last arguement of filters
            routeOption = {param: param, name: name},
            filterArgs = _(arguments).toArray().concat(routeOption)

        // Call the before filter and if it returns false, run the
        // route's original callback, and after filter. This allows
        // the user to return false from within the before filter
        // to prevent the original route callback and after
        // filter from running.
        if (this.before.apply(this, filterArgs) === false) { return }

        // If the callback exists, then call it. This means that the before
        // and after filters will be called whether or not an actual
        // callback function is supplied to handle a given route.
        if (callback) { callback.apply(this, filterArgs) }

        // Call the after filter.
        this.after.apply(this, filterArgs)

      }, this)

      // Call our original route, replacing the callback that was originally
      // passed in when Backboun.Router.route was invoked with our wrapped
      // callback that calls the before and after callbacks as well as the
      // original callback.
      return originalRoute.call(this, route, name, wrappedCallback)
    }

  });

}(Backbone, _));
