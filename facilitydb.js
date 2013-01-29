/**
 * File facilitydb.js 
 * Author: Jerome Boulanger (jerome.boulanger@curie.fr) 
 * Description : Manage a list of instruments from several facilities 
 *               by using Google Doc as a storage backend. There is one 
 *               google doc by facility and one google listing the facilities.
 *               The google docs has to be readable (share) and published to 
 *               the web as rss (file>publish).
 * 
 * The html template has the following form:
 * <html>
 * <head>
 *   <title></title>
 *   <link rel="stylesheet" type="text/css" href="facility.css"/>
 *   <script type="text/javascript" src="http://www.google.com/jsapi"></script>
 *   <script type="text/javascript" src="jquery-1.4.4.min.js"></script>
 *   <script src="https://raw.github.com/janl/mustache.js/master/mustache.js"></script>
 *   <script type="text/javascript" src="facilitydb.js"></script>
 *   <script> dbkey = "{{insert your feed key here}}"</script>
 *   <script id="instrument-template" type="text/template">{{Insert your mustache.js template here}} </script>
 * </head>
 *   <body>
 *     <div id="facility_div"></div>
 *     <div id="instrument_list"></div>
 *   </body>
 * </html>
 */

var facilities_table = new Array(); // facilities table
var instruments_table = new Array(); // instruments table
var modalities_table = new Array();  // modalities table

function getSpreadsheetEntryColumnIndex(entry){
    return entry.title.split('').filter(function(value){return isNaN(value);}).join();
}

function getSpreadsheetEntryRowIndex(entry){
    return parseInt(entry.title.split('').filter(function(value){return !isNaN(value);}).join());
}

function getFeedFacilityKey(json){
    return json.feed.link.split('/')[3].split('=')[1];
}

function getSpreadsheetEntryContent(json,row,col){
    return json.feed.entries[col + json.feed.number_of_columns * row].content;
}

/**
 * Read a google feed and compute row and columns number in the spreadsheet from the title
 */
function tagsAndSortEntries(json){
    var number_of_columns = 0;
    var number_of_rows = 0;
    for (var i = 0; i < json.feed.entries.length; i++) {
	var entry = json.feed.entries[i];
	json.feed.entries[i].row = getSpreadsheetEntryRowIndex(entry)-1;
	json.feed.entries[i].col = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(getSpreadsheetEntryColumnIndex(entry));
	if (json.feed.entries[i].col > number_of_columns) { number_of_columns = json.feed.entries[i].col; }
	if (json.feed.entries[i].row > number_of_rows) { number_of_rows = json.feed.entries[i].row; }
    }

    json.feed.number_of_columns = number_of_columns+1;
    json.feed.number_of_rows = number_of_rows+1;

    for (var i = 0; i < json.feed.entries.length; i++) {
	json.feed.entries[i].idx = json.feed.entries[i].col + json.feed.number_of_columns * json.feed.entries[i].row;
    }	
    json.feed.entries.sort(function(a,b){return a.idx - b.idx;});

    console.log(number_of_columns + 'x' + number_of_rows)
    return json;
}

/**
 * Populate the modality table
 */
function populateModalitiesTable(){
    var names = ["confocal","widefield"];
    for (var i = 0; i < names.length; i++) {	    
	modalities_table.push(new Object()); 
	modalities_table[i].name = names[i];
    }
}

/**
 * Convert a feed from google spreadsheet to list of instruments object
 */
function populateInstrumentsTable(json){
    json = tagsAndSortEntries(json);
    var facility_key = getFeedFacilityKey(json);    
    for (var row = 1; row < json.feed.number_of_rows; row++){
	var instrument = new Object();
	instrument.facility = facility_key;
	instrument.name = getSpreadsheetEntryContent(json,row,0);
	instrument.short_description = getSpreadsheetEntryContent(json,row,1);
	instrument.long_description = getSpreadsheetEntryContent(json,row,2);
	instrument.link = getSpreadsheetEntryContent(json,row,3);
	instrument.image = getSpreadsheetEntryContent(json,row,4);
	instrument.access_policy = getSpreadsheetEntryContent(json,row,5);
	instrument.modalities = getSpreadsheetEntryContent(json,row,6);
	instruments_table.push(instrument);
    }
}

/**
 * Convert a feed from google spreadsheet to list of facilitys object
 */
function populateFacilitiesTable(json){
    json = tagsAndSortEntries(json);
    for (var row = 1; row < json.feed.number_of_rows; row++){
	var facility = new Object();
	facility.name = getSpreadsheetEntryContent(json,row,0);
	facility.key = getSpreadsheetEntryContent(json,row,1);	
	facilities_table.push(facility);
    }
}

function select_instruments(item){
    var facility_form = document.getElementById('facility_form');    
    var condFacility = true;
    if (facility_form[0].selectedIndex > 0) {
	condFacility =item.facility == facilities_table[facility_form[0].selectedIndex-1].key
    }
    
    var condModality = true;
    if (facility_form[1].selectedIndex > 0){
	condModality = item.modalities.split(';').indexOf(facility_form[1][facility_form[1].selectedIndex].text) >= 0;
    }

    return condFacility && condModality;
}

/**
 * Read the selected facilities and display the instruments
 */
function displayInstruments() {
    removeOldResults();
    var div = document.getElementById('instrument_list');
    var p = document.createElement('p');
    p.appendChild(document.createTextNode('Loading...'));
    div.appendChild(p);

    var instruments_selection = new Object();       		
    instruments_selection.instruments = instruments_table.filter(select_instruments);	
    
    var template = "<div class='instrument'> <h3> The infrastructure has "+instruments_selection.instruments.length+" instruments:</h3>"
    template += $('#instrument-template').html();
    template += "</div>";
    document.getElementById('instrument_list').innerHTML = Mustache.to_html(template, instruments_selection);  
}

/**
 * Callback for google.feed.load() in order to get instruments list
 */
function onLoadInstruments(result){
    if (!result.error) {
	populateInstrumentsTable(result);
	displayInstruments();
    } else {
	console.log('Failed to load Instruments');
    }
}

/**
 * Create the feed to get the insturment list
 */
function getInstruments(){    
    for (var i = 0; i < facilities_table.length; i++){
	var url = 'https://spreadsheets.google.com/feeds/cells/' + facilities_table[i].key + '/od6/public/values?alt=rss';
	var feed = new google.feeds.Feed(url);
	feed.includeHistoricalEntries();
	feed.setNumEntries(200);
	feed.load(onLoadInstruments);
    }
}


/**
 * Callback for google.feed.load() in order to get facilities list
 * Convert the feed to a list of facilities and create a form for selecting facilites
 */
function onLoadFacility(result){
    if (!result.error) {
	populateFacilitiesTable(result);
	getInstruments();
	populateModalitiesTable();
	// Built the form for selecting facilities
	var template = "<form onsubmit='return false' id='facility_form'><select name='facility_name' onchange='displayInstruments();'><option>all</option>{{#facilities}}<option>{{name}}</option>{{/facilities}}</select><select name='modality_name' onchange='displayInstruments();'><option>all</option>{{#modalities}}<option>{{name}}</option>{{/modalities}}</select></form>"
	var div = document.getElementById('facility_div');
	var facilities = new Object();
	facilities.facilities = facilities_table;
	facilities.modalities = modalities_table;
	div.innerHTML = Mustache.to_html(template, facilities);
    }
}

/**
 * On load Callback creating the page
 */
function getFacilities(){
    var maindb_url = 'https://spreadsheets.google.com/feeds/cells/'+dbkey+'/od6/public/values?alt=rss';
    var feed = new google.feeds.Feed(maindb_url);
    feed.includeHistoricalEntries();
    feed.setNumEntries(200);
    feed.load(onLoadFacility);
}

/**
 * Removes the output generated from the previous result.
 */
function removeOldResults() {
  var div = document.getElementById('instrument_list');
  if (div.firstChild) {
    div.removeChild(div.firstChild);
  }
}

// Load the google feed library and set the callback
google.load("feeds", "1");
google.setOnLoadCallback(getFacilities);
