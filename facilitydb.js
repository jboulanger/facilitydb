

/**
 * Convert a feed from google spreadsheet to list of instruments object
 */
function jsonFeed2Instruments(json){
    var instrument_array = new Array();
    var instrument;
    for (var i = 0; i < json.feed.entry.length; i++) {
	var entry = json.feed.entry[i];
	if (parseInt(entry.gs$cell.row)>1) {
	    switch (parseInt(entry.gs$cell.col)){	    
	    case 1: instrument = new Object(); instrument.name = entry.content.$t; break;
	    case 2: instrument.short_description = entry.content.$t; break;
	    case 3: instrument.long_description = entry.content.$t; break;
	    case 4: instrument.link = entry.content.$t; break;
	    case 5: instrument.image = entry.content.$t; instrument_array.push(instrument); break;
	    }
	}
    }
    var list = new Object();
    list.instruments = instrument_array;
    return list;
}


/**
 * Lists the entries from the specified JSON feed
 */
function cellEntries2(json) {
    removeOldResults();
    // convert the feed to an instrument list
    var instruments = jsonFeed2Instruments(json);
    // define formating moustache template (transformation)
    var template = "<h1>Liste des instruments</h1>{{#instruments}}<h3>&nbsp;{{name}}:</h3> <strong>{{short_description}}</strong></br><table><tr><td><div style=\"text-align:justify\">{{long_description}}</div></br><a href=\"{{link}}\">>>Technical Sheet</a></td><td><img src=\"{{image}}\"></td></tr></table>{{/instruments}}";
    // apply the transform and set the output in the data div
    var div = document.getElementById('data');
    div.innerHTML = Mustache.to_html(template, instruments);
    // Re-enable the ok button.
    var ok_button = document.getElementById('ok_button');
    ok_button.removeAttribute('disabled');
}

/**
 * Called when the user clicks the 'OK' button to
 * retrieve a spreadsheet's JSON feed.  Creates a new 
 * script element in the DOM whose source is the JSON feed, 
 * and specifies that the callback function is 
 * 'listEntries' for a list feed and 'cellEntries' for a
 * cells feed (above).
 */
function displayResults(query) {
  removeOldJSONScriptNodes();
  removeOldResults();

  // Show a "Loading..." indicator.
  var div = document.getElementById('data');
  var p = document.createElement('p');
  p.appendChild(document.createTextNode('Loading...'));
  div.appendChild(p);
  
  // Disable the OK button
  var ok_button = document.getElementById('ok_button');
  ok_button.disabled = 'true';

  // Retrieve the JSON feed.
  var script = document.createElement('script'); 

  if (query.feed.options[query.feed.selectedIndex].text == 'cells') {
    script.setAttribute('src', 'http://spreadsheets.google.com/feeds/'
                         + query.feed.options[query.feed.selectedIndex].text 
                         + '/' + query.key.value 
                         + '/' + query.worksheet.value + '/public/values' +
                        '?alt=json-in-script&callback=cellEntries2');
  }
  
  script.setAttribute('id', 'jsonScript');
  script.setAttribute('type', 'text/javascript');
  document.documentElement.firstChild.appendChild(script);;
}

function displayResults(query) {
  removeOldJSONScriptNodes();
  removeOldResults();

  // Show a "Loading..." indicator.
  var div = document.getElementById('data');
  var p = document.createElement('p');
  p.appendChild(document.createTextNode('Loading...'));
  div.appendChild(p);
  
  // Disable the OK button
  var ok_button = document.getElementById('ok_button');
  ok_button.disabled = 'true';

  // Retrieve the JSON feed.
  var script = document.createElement('script'); 

  if (query.feed.options[query.feed.selectedIndex].text == 'cells') {
    script.setAttribute('src', 'http://spreadsheets.google.com/feeds/'
                         + query.feed.options[query.feed.selectedIndex].text 
                         + '/' + query.key.value 
                         + '/' + query.worksheet.value + '/public/values' +
                        '?alt=json-in-script&callback=cellEntries2');
  }
  
  script.setAttribute('id', 'jsonScript');
  script.setAttribute('type', 'text/javascript');
  document.documentElement.firstChild.appendChild(script);;
}



function onLoadFacility(result){
    if (!result.error) {
	// Grab the container we will put the results into
	var container = document.getElementById("data");
	container.innerHTML = '';

	// Loop through the feeds, putting the titles onto the page.
	// Check out the result object for a list of properties returned in each entry.
	// http://code.google.com/apis/ajaxfeeds/documentation/reference.html#JSON
	for (var i = 0; i < result.feed.entries.length; i++) {
	    var entry = result.feed.entries[i];
	    var div = document.createElement("div");
	    div.appendChild(document.createTextNode(entry.content.$t));
	    container.appendChild(div);
	}
    }
}

function getFacilities(){
    var url='https://spreadsheets.google.com/feeds/cells/0Ap1j--7QYzUydGJiVWItYUJmblk4S25ic0wxNTVGWlE/od6/public/basic?alt=rss'
    var feed = new google.feeds.Feed(url);
    feed.load(onLoadFacility);
}

/**
 * Removes the script element from the previous result.
 */
function removeOldJSONScriptNodes() {
  var jsonScript = document.getElementById('jsonScript');
  if (jsonScript) {
    jsonScript.parentNode.removeChild(jsonScript);
  }
}

/**
 * Removes the output generated from the previous result.
 */
function removeOldResults() {
  var div = document.getElementById('data');
  if (div.firstChild) {
    div.removeChild(div.firstChild);
  }
}

google.load("feeds", "1");
google.setOnLoadCallback(getFacilities);