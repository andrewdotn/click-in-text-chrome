$.noConflict();
(function($) {
  var $debug = false;

  var original_console_log = console.log;
  console.log = function(arg) {
    if ($debug) {
      original_console_log.call(this, arg);
    }
  }

  var tooltip = new Tooltip();
  var start_tip = new Tooltip();

  $(document).bind('mousestop', function(e) {

    //TODO option to show translation in a growl type popup (in the corner)
    //TODO 'no style' class for transover element
    //TODO fix popup getting out of frames

    function getHitWord(e) {
      var hit_word = '';
      var hit_elem = $(document.elementFromPoint(e.clientX, e.clientY));

      //don't mess with html inputs
      if (/INPUT|TEXTAREA/.test( hit_elem.get(0).nodeName )) {
        return '';
      }

      //get text contents of hit element
      var text_nodes = hit_elem.contents().filter(function(){
        return this.nodeType == Node.TEXT_NODE && XRegExp("\\p{L}{2,}").test( this.nodeValue )
      });

      //bunch of text under cursor? break it into words
      if (text_nodes.length > 0) {
        if (hit_elem.get(0).nodeName != 'TRANSOVER') {
          //wrap every word in every node in a dom element (real magic happens here)
          text_nodes.replaceWith(function(i) {
            return $(this).text().replace(XRegExp("(\\p{L}+)", 'g'), "<transover>$1</transover>")
          });
        }

        //get the exact word under cursor (and here)
        var hit_word_elem = document.elementFromPoint(e.clientX, e.clientY);

        //no word under cursor? we are done
        if (hit_word_elem.nodeName != 'TRANSOVER') {
          console.log("missed!");
        }
        else  {
          hit_word = $(hit_word_elem).text();
          console.log("got it: "+hit_word);
        }
      }
      else { console.log("no text") }

      return hit_word;
    }

    //respect 'translate only when shift pressed' option
    if (options.shift_only && !shift_pressed) { return }

    //respect "don't translate these sites"
    if ($.grep(options.except_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0) { return }

    if (!options.target_lang) {
      start_tip.show(e.clientX, e.clientY, 'Please, choose language to translate into in TransOver <a href="'+chrome.extension.getURL('options.html')+'">options</a>');
    }
    else {
      var show_result = function(response) {
        console.log('response: "'+response.source_lang+'" '+response.translation);
        if (options.target_lang == response.source_lang) {
          console.log('skipping translation into the same language');
        }
        else {
          tooltip.show(e.clientX, e.clientY, response.translation);
        }
      };

      // translate API for text selection
      var selection = window.getSelection();
      var hit_elem = document.elementFromPoint(e.clientX, e.clientY);
      if (selection.toString() != '' && selection.containsNode(hit_elem, true)) {
        chrome.extension.sendRequest({handler: 'bulk_translate', text: selection.toString()}, show_result);
      }
      // dictionary API for word under mouse
      else {
        var word = getHitWord(e);

        if (word != '') {
          chrome.extension.sendRequest({handler: 'translate', word: word}, show_result);
        }
      }
    }
  });

  var shift_pressed = false;
  $(document)
    .keydown(function(event) {
      if (event.keyCode == 16) {
        shift_pressed = true;
      }
    }).keyup(function(event) {
      if (event.keyCode == 16) {
        shift_pressed = false;
      }
    });

  var timer25;
  // setup mousestop event
  // mousestop triggers the entire thing - it is an entry point
  $(document).mousemove(function(e){
    clearTimeout(timer25);

    timer25 = setTimeout(function() {

      if (last_x != e.clientX && last_y != e.clientY) { return }

      var mousestop = new $.Event("mousestop");
      mousestop.clientX = e.clientX;
      mousestop.clientY = e.clientY;
      $(document).trigger(mousestop);
    }, options.shift_only ? 200 : options.delay);
  });

  var last_x, last_y;

  // hide translation on any move
  $(document).mousemove(function(e) {
    if (last_x != e.clientX || last_y != e.clientY) {
      tooltip.hide();
    }
    last_x = e.clientX;
    last_y = e.clientY;
  });
  $(window).scroll(function() { tooltip.hide() });

  // hide start_tip on click outside and escape
  $(document)
    .click(function(e) {
      var hit_elem = document.elementFromPoint(e.clientX, e.clientY);
      if (!$(hit_elem).hasClass('to-tooltip')) {
        start_tip.hide();
      }
    }).keydown(function(e) {
      if (e.keyCode == 27) {
        start_tip.hide();
      }
    });

  //chrome.extension.sendRequest({handler: 'set_encoding', encoding: document.charset});

  var options = {};
  chrome.extension.sendRequest({handler: 'get_options'}, function(response) {
    options = response.options;
  });

})(jQuery);

