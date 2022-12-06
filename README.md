# Analytics

a small analytics abstraction library. tracks page views, is extensible with custom events, and can identify visitors.

## Table of Contents

  

- [Features](#features)
- [Why](#why)
- [Inspiration](#Inspiration)
- [Differences](#differences)
- [Install](#install)
- [Use](#use)
	- [analytics.track](#analytics.track)
	- [analytics.identity](#analytics.identity)
	- [analytics.page](#analytics.page)
	- [analytics.ready](#analytics.ready)
	- [analytics.on](#analytics.ready)
	- [analytics.once](#analytics.once)
	- [analytics.getState](#analytics.getState)
	- [analytics.storage](#analytics.storage)
	- [analytics.plugins](#analytics.plugins)
	
-  [Lifecycle](#Lifecycle)
	
	


## Features
- Built with *Typescript*
- Has a lifecycle system that is easy to attach to trigger behaviour for events.
- Queues events to make it easy to, stop, start, and process events in various conditions.
- Easy to add plugins



## Why
There are a ton of libraries for sending analytics on customer behaviour for websites.  This library is meant to serve as a base for tying all those pieces together. This plugin acts as a single layers send events to multiple solutions from the client.

You should:
- Be able to add and remove plugins dynamically. This means even ***asynchronously***! Plugins have never been more flexible.
- You should edit privacy setting easily.

## Inspiration
David Wells [analytics](https://github.com/DavidWells/analytics) library is and has been a popular solution for standardizing analytics. This library aims to be improve on speed, extensibility and features.

This library was built to be backwards compatible with the David Wells analytics library. As such popular plugins should work well the the library.

## Differences

#### Asynchrous Plugns
All plugins in this libray added after the library loads. Even those passed during initialization are actually asynchrously added.

This piece of code

```typescript
const { analytics } = Analytics({
    name: 'my-analytics',
	plugins: [debugPlugin()],
});
```


is no different from this piece of code.

```typescript
const { analytics } = Analytics({name: 'my-analytics'});
analytics.addPlugins(debugPlugin());
```

## Install

```
npm install recursive-house/analytics
```

## Basic Use

```Typescript
const { analytics } = Analytics({
	name: 'my-analytics',
	plugins: [debugPlugin()],
});

/** make a page call */
analytics.page();

/** make a track call */
analytics.track('product-click', () => {
	product: 'shoes',
	sku: 'QWE2ERT4DFV7NHO9'
});
```


## analytics.track

track an event which triggers `track` calls in all installed plugins

```typescript

// basic track call
analytics.track('carousel-left-click');

//fire callback
analytics.track('carousel-left-click', () => {
 console.log('carousel-left-click event sent');
});

// send track call only to specific analytics tool
analytics.track('segment-only-event', {
	part: 1,
	sku: 'hjk3oiu6gha8qwe0cvf7'
}, {
	all: false,
	segmentio: true
});
```

## analytics.identify

This triggers the `identity` call which installed plugins pickup to setup localStorage.

```typescript

// basic trigger for user id
analytics.identify('steve-balmer');

// send user data to specific analytics tools
analytics.identify('steve-jobs', {}, {
  plugins: {
    all: false,
    google: true
  }
});
```


## analytics.page

Trigger a page view that calls all installed plugins

```typescript
analytics.page();

// send page view to specific analytics tools
analytics.page({}, {
  plugins: {
    all: false,
    google: true
  }
});
```


## analytics.ready

Fires when analytics library is ready

```typescript
analytics.ready(payload => console.log('all plugins locked and loaded'))
```

## analytics.user

Get the current user data of the analytics tool

```typescript
const userData = analytics.user();
```

## analytics.on

attach an event listener on a lifecycle event

```typescript
analytics.on('track', ({ payload }) => {
	console.log('what track are we on?');
})
```

## analytics.once

Only trigger an event once.

```typescript

//create listener
const listener = analytics.once('page', ({ payload }) => {
	con
});

// cleanup listener
listener();
```


## analytics.getState

Get the current state of the analytics library.

```typescript
// get current state
analytics.getState();

// get sub state
analytics.getState('customerio.initialized');
```

## analytics.storage

storage utilities. These utilities should let you store data in local storage, cookies or to the window.

```typescript
const { storage } =  analytics;

storage.getItem('store_key');
storage.setItem('store_key', 'veritas');
storage.removeItem('ad absurdum');
```

## analytics.plugins

Methods for managing the state of plugins

```typescript
const { plugins } = analytics;

plugins.enable('customerio');
plugins.disable('google-analytics');
```

