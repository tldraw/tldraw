# is-json

<a href="https://nodei.co/npm/is-json/"><img src="https://nodei.co/npm/is-json.png?downloads=true"></a>

[![Build Status](https://travis-ci.org/joaquimserafim/is-json.png?branch=master)](https://travis-ci.org/joaquimserafim/is-json)


check if a string is a valid JSON string without using Try/Catch and is a JSON object



**V1.2**


isJSON(str*, [passObjects=bool])

*with `passObjects = true` can pass a JSON object in `str`, default to `false`


	  var isJSON = require('is-json');

	  var good_json = '{"a":"obja","b":[0,1,2],"c":{"d":"some object"}}';
	  var bad_json = '{"a":"obja""b":[0,1,2],"c":{"d":"some object"}}';
	  var str_number = '121212';


	  console.log(isJSON(good_json)); // true
      console.log(isJSON(bad_json)); // false
	  console.log(isJSON(str_number)); // false



	  // check is an object

	  var object = {a: 12, b: [1,2,3]};

	  console.log(isJSON(object, true)); // true

    // can use isJSON.strict (uses try/catch) if wants something more robust

    console.log(isJSON.strict('{\n "config": 123,\n "test": "abcde" \n}')); // true
