'use strict';
var htmlTags = require('html-tags');

var basic = /\s?<!doctype html>|(<html\b[^>]*>|<body\b[^>]*>|<x-[^>]+>)+/i;

var full = new RegExp(htmlTags.map(function (el) {
	return '<' + el + '\\b[^>]*>';
}).join('|'), 'i');

module.exports = function (str) {
	if (basic.test(str)) {
		return true;
	}

	return full.test(str);
};
