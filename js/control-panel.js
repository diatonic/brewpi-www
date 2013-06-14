/* Copyright 2012 BrewPi/Elco Jacobs.
 * This file is part of BrewPi.

 * BrewPi is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * BrewPi is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with BrewPi.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global google, receiveControlSettings, window.googleDocsKey, controlSettings, controlVariables */

var beerTemp = 20.0;
var fridgeTemp = 20.0;

function drawProfileChart() {
	"use strict";
	var query = new google.visualization.Query(
		'https://docs.google.com/spreadsheet/tq?range=D:E&key=' + window.googleDocsKey);
	query.send(handleProfileChartQueryResponse);
}

function handleProfileChartQueryResponse(response) {
	"use strict";
	if (response.isError()) {
		window.alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
	return;
  }
	var profileData = response.getDataTable();
	var profileChart = new google.visualization.AnnotatedTimeLine(document.getElementById('profileChartDiv'));
	profileChart.draw(profileData, {
		'displayAnnotations': true,
		'scaleType': 'maximized',
		'displayZoomButtons': false,
		'allValuesSuffix': '\u00B0',
		'numberFormats': '##.0',
		'displayAnnotationsFilter': true});
}

function drawProfileTable() {
	"use strict";
	var query = new google.visualization.Query(
		'https://docs.google.com/spreadsheet/tq?range=C:E&where=D<date "2070-01-01"&key=' + window.googleDocsKey);
	query.send(handleProfileTableQueryResponse);
}

function handleProfileTableQueryResponse(response){
	"use strict";
	if (response.isError()) {
		window.alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
		return;
	}

	var profileData = response.getDataTable();
	var profileTable = new google.visualization.Table(document.getElementById('profileTableDiv'));
	profileTable.draw(profileData,null);
}

function statusMessage(messageType, messageText){
	"use strict";
    var $statusMessage = $("#status-message");
    var $statusMessageIcon = $statusMessage.find("p span#icon");
    $statusMessage.removeClass("ui-state-error ui-state-default ui-state-highlight");
    $statusMessageIcon.removeClass("ui-icon-error ui-icon-check ui-icon-info");
	switch(messageType){
		case "normal":
            $statusMessageIcon.addClass("ui-icon-check");
            $statusMessage.addClass("ui-state-default");
			break;
		case "error":
            $statusMessageIcon.addClass("ui-icon-error");
            $statusMessage.addClass("ui-state-error");
			break;
		case "highlight":
            $statusMessageIcon.addClass("ui-icon-info");
            $statusMessage.addClass("ui-state-highlight");
			break;
	}
    $statusMessage.find("p span#message").text(messageText);
}

function loadControlPanel(){
	"use strict";
	drawProfileChart();
	drawProfileTable();
	receiveControlSettings(function(){
        if(window.controlSettings === {}){
            return;
        }
        var $controlPanel = $('#control-panel');
		switch(window.controlSettings.mode){
			case 'p':
                $controlPanel.tabs( "select" , 0);
				statusMessage("normal","Running in beer profile mode");
				break;
			case 'b':
                $controlPanel.tabs( "select" , 1);
				statusMessage("normal","Running in beer constant mode");
				break;
			case 'f':
                $controlPanel.tabs( "select" , 2);
				statusMessage("normal","Running in fridge constant mode");
				break;
			case 'o':
                $controlPanel.tabs( "select" , 3);
				statusMessage("normal","Temperature control disabled");
				break;
			default:
				statusMessage("error","Invalid mode ("+window.controlSettings.mode+") received");
		}
		window.beerTemp = window.controlSettings.beerSet;
		window.fridgeTemp = window.controlSettings.fridgeSet;
		// beer and fridge temp can be null when not active (off mode)
		if(window.beerTemp === null){
			window.beerTemp = 20.0;
		}
		if(window.fridgeTemp === null){
			window.fridgeTemp = 20.0;
		}
		$("#beer-temp").find("input.temperature").val(window.beerTemp.toFixed(1));
		$("#fridge-temp").find("input.temperature").val(window.fridgeTemp.toFixed(1));
	});
}

function tempUp(temp){
	"use strict";
	temp += 0.1;
	if(temp > window.controlConstants.tempSetMax){
		temp = window.controlConstants.tempSetMin;
	}
	return temp;
}

function tempDown(temp){
	"use strict";
	temp -= 0.1;
	if(temp < window.controlConstants.tempSetMin){
		temp = window.controlConstants.tempSetMax;
	}
	return temp;
}

function applySettings(){
	"use strict";
	//Check which tab is open
	if($("#profile-control").hasClass('ui-tabs-hide') === false){
        // upload profile to pi
        $.post('socketmessage.php', {messageType: "uploadProfile", message: ""}, function(answer){
           if(answer !==''){
               statusMessage("highlight", answer);
           }
        });
        // set mode to profile
        $.post('socketmessage.php', {messageType: "setProfile", message: ""}, function(){});
	}
	else if($("#beer-constant-control").hasClass('ui-tabs-hide') === false){
		$.post('socketmessage.php', {messageType: "setBeer", message: String(window.beerTemp)}, function(){});
		statusMessage("highlight","Mode set to beer constant");
	}
	else if($("#fridge-constant-control").hasClass('ui-tabs-hide') === false){
		$.post('socketmessage.php', {messageType: "setFridge", message: String(window.fridgeTemp)}, function(){});
		statusMessage("highlight","Mode set to fridge constant");
	}
	else if($("#temp-control-off").hasClass('ui-tabs-hide') === false){
		$.post('socketmessage.php', {messageType: "setOff", message: ""}, function(){});
		statusMessage("highlight","Temperature control disabled");
	}
	setTimeout(loadControlPanel,5000);
}

$(document).ready(function(){
	"use strict";
	//Control Panel
	$('#control-panel').tabs();

	$("button#refresh-controls").button({icons: {primary: "ui-icon-arrowrefresh-1-e"} }).click(function(){
		drawProfileChart();
		drawProfileTable();
	});
    // unhide after loading
    $("#control-panel").css("visibility", "visible");

	$("button#edit-controls").button({	icons: {primary: "ui-icon-wrench" } }).click(function(){
		window.open("https://docs.google.com/spreadsheet/ccc?key=" + window.googleDocsKey);
	});

	$("button#apply-settings").button({ icons: {primary: "ui-icon-check"} }).click(function(){
		applySettings();
	});

	// set functions to validate and mask temperature input
	$("input.temperature").each( function(){
        $(this).blur(function(){
            // validate input when leaving field
            var temp = parseFloat($(this).val());
            if(temp < window.controlConstants.tempSetMin){
                temp = window.controlConstants.tempSetMin;
                $(this).val(temp);
            }
            if(temp > window.controlConstants.tempSetMax){
                temp = window.controlConstants.tempSetMax;
                $(this).val(temp);
            }
            if(isNaN(temp)){
                temp = 20.0;
            }
            $(this).val(temp.toFixed(1));
            if($(this).parent().attr('id').localeCompare("beer-temp") === 0){
                window.beerTemp=parseFloat(temp);
            }
            if($(this).parent().attr('id').localeCompare("fridge-temp") === 0){
                window.fridgeTemp=parseFloat(temp);
            }
        });
        $(this).keyup(function(event) {
            // if it is a dot, only allow one in the input
            if (event.which === 38){
                $(this).val(tempUp(parseFloat($(this).val())).toFixed(1));
            }
            else if (event.which === 40){
                $(this).val(tempDown(parseFloat($(this).val())).toFixed(1));
            }
        });
    });

	//Constant temperature control buttons
	$("button#beer-temp-up").button({icons: {primary: "ui-icon-triangle-1-n"} }).bind({
		mousedown: function(){
			window.beerTemp=tempUp(window.beerTemp);
			$("#beer-temp").find("input.temperature").val(window.beerTemp.toFixed(1));
			window.beerTempUpTimeOut = window.setInterval(function(){
				window.beerTemp=tempUp(window.beerTemp);
				$("#beer-temp").find("input.temperature").val(window.beerTemp.toFixed(1));
			}, 100);
		},
		mouseup: function(){
			if(typeof(window.beerTempUpTimeOut)!=='undefined'){
				clearInterval(window.beerTempUpTimeOut);
			}
		},
		mouseleave: function(){
			if(typeof(window.beerTempUpTimeOut)!=='undefined'){
				clearInterval(window.beerTempUpTimeOut);
			}
		}
	});

	$("button#beer-temp-down").button({icons: {primary: "ui-icon-triangle-1-s"} }).bind({
		mousedown: function() {
			window.beerTemp=tempDown(window.beerTemp);
			$("#beer-temp").find("input.temperature").val(window.beerTemp.toFixed(1));
			window.beerTempDownTimeOut = window.setInterval(function(){
				window.beerTemp=tempDown(window.beerTemp);
				$("#beer-temp").find("input.temperature").val(window.beerTemp.toFixed(1));
			}, 100);
		},
		mouseup: function(){
			if(typeof(window.beerTempDownTimeOut)!=='undefined'){
				clearInterval(window.beerTempDownTimeOut);
			}
		},
		mouseleave: function(){
			if(typeof(window.beerTempDownTimeOut)!=='undefined'){
				clearInterval(window.beerTempDownTimeOut);
			}
		}
	});

	//Constant fridge temperature control buttons
	$("button#fridge-temp-up").button({icons: {primary: "ui-icon-triangle-1-n"}	}).bind({
		mousedown: function() {
			window.fridgeTemp=tempUp(window.fridgeTemp);
			$("#fridge-temp").find("input.temperature").val(window.fridgeTemp.toFixed(1));
			window.fridgeTempUpTimeOut = window.setInterval(function(){
				window.fridgeTemp=tempUp(window.fridgeTemp);
				$("#fridge-temp").find("input.temperature").val(window.fridgeTemp.toFixed(1));
			}, 100);
		},
		mouseup: function(){
			if(typeof(window.fridgeTempUpTimeOut)!=='undefined'){
				clearInterval(window.fridgeTempUpTimeOut);
			}
		},
		mouseleave: function(){
			if(typeof(window.fridgeTempUpTimeOut)!=='undefined'){
				clearInterval(window.fridgeTempUpTimeOut);
			}
		}
	});

	$("button#fridge-temp-down").button({icons: {primary: "ui-icon-triangle-1-s"}	}).bind({
		mousedown: function() {
			window.fridgeTemp=tempDown(window.fridgeTemp);
			$("#fridge-temp").find("input.temperature").val(window.fridgeTemp.toFixed(1));
			window.fridgeTempDownTimeOut = window.setInterval(function(){
				window.fridgeTemp=tempDown(window.fridgeTemp);
				$("#fridge-temp").find("input.temperature").val(window.fridgeTemp.toFixed(1));
			}, 100);
		},
		mouseup: function(){
			if(typeof(window.fridgeTempDownTimeOut)!=='undefined'){
				clearInterval(window.fridgeTempDownTimeOut);
			}
		},
		mouseleave: function(){
			if(typeof(window.fridgeTempDownTimeOut)!=='undefined'){
				clearInterval(window.fridgeTempDownTimeOut);
			}
		}
	});
});
