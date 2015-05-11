/*global tinyMCE: false, document: false, window: false, jQuery: false */
(function ($) {
    "use strict";

    var original_fields = [],
        destination_fields = [],
        padding = 0;

    function sync_element_vertically(original, destination, padding, first) {
        var default_props = {
            position: "",
            top: ""
        },
            original_top = 0,
            original_padding = 0,
            destination_top = 0,
            destination_padding = 0,
            shift = 0,
            more_padding = 0,
            images, new_distance;

        function distance(a, b) {
            return b.position().top - a.position().top - a.height();
        }
        // ... Removing original plone.app.multilingual's code that crash with archetypes.
                
        // With all that padding, the form might need to be pushed down in
        // some cases.
        $([original, destination]).each(function (index, item) {
            
            var curr_item = $(item),
                outer_padding = 0,
                parent = curr_item.parent();
                // Test for archetype item traduction
                if (curr_item.position() != undefined) {
                    outer_padding = Math.max(curr_item.position().top + curr_item.height() - (parent.position().top + parent.height()) + padding, 0);                //code
                    if (outer_padding) {
                        parent.height(parent.height() + outer_padding);
                    }
                }
        });
    }
    
    function sync_elements_vertically() {
        // We do NOT calculate padding here again, because we might get
        // to high padding because fields might have been shifted, increasing
        // the padding.
        var i = 0;
        $.each(original_fields, function (i) {
            sync_element_vertically($(original_fields[i]), $(destination_fields[i]), padding, i === 0);
        });
    }

    function update_view() {
        var order = 1,
            url_translate = $('input#url_translate').val(),
            langSource = $('#frame-content #view_language')[0].innerHTML;

        $('#form-target fieldset > div > .field').unwrap();

        original_fields = $('#frame-content .field');
        destination_fields = $('#form-target fieldset > .field');

        // Calculate the padding between fields as intended by css
        if (original_fields.length > 1) {
            padding = ($(original_fields[1]).position().top - $(original_fields[0]).position().top - $(original_fields[0]).height());
        }
        $.each(original_fields, function (index, value) {
            var original_field = $(value);
            var destination_field = $(destination_fields[index]);
            sync_element_vertically(original_field, destination_field, padding, index === 0);

            // Add the google translation field
            if ($('#gtanslate_service').attr('value') === "True" && ((original_field.find('.richtext-field, .textline-field, .text-field, .localstatic-field, .ArchetypesField-TextField').length > 0) || ($('#at-babel-edit').length > 0))) {
                original_field.prepend("<div class='translator-widget' id='item_translation_" + order + "'></div>");
                original_field.children('.translator-widget').click(function () {
                    var field = $(value).attr("rel");
                        // Fetch source of text to translate.
                    var jsondata = {
                            'field': field,
                            'lang_source': langSource
                        };
                    var targetelement = destination_field.find('textarea');
                    var tiny_editor = destination_field.find("textarea.mce_editable");
                    if (!targetelement.length) {
                        targetelement = destination_field.find("input");
                    }
                    // Now we call the data
                    $.ajax({
                        url: url_translate + '/gtranslation_service',
                        data: jsondata,
                        dataType: 'json',
                        type: 'POST',
                        success: function (data) {
                            var text_target = data.data;
                            if (tiny_editor.length > 0) {
                                tinyMCE.get(tiny_editor.attr('id')).setContent(text_target);
                            } else {
                                targetelement.val(text_target); // Inserts translated text.
                            }
                        }
                    });
                });
                original_field.children('.translator-widget').hide();
                order += 1;
            }
        });
    }

    $(document).ready(function () {

        /* alert about language independent field */
        $('.languageindependent').click(function () {
            $(this).css('opacity', '1');
        });

        /* change the language trigger */
        $('#trans-selector button').click(function () {
            var url = $(this).data('url');
            $('#frame-content').load(url, function () {
                $("#frame-content fieldset legend").unwrap().remove();
                update_view();
            });
            $('#trans-selector button.active').removeClass('active');
            $(this).addClass('active');
        });
        /* change the language trigger, this time for the drop-down, which is
        used when too many translations are present to fit into buttons */

        
        $('#trans-selector select').change(function () {
            var selected_elem = $(this).children('option').eq(this.selectedIndex);
            var url = selected_elem.val();
            $('#frame-content').load(url, function () {
                $("#frame-content fieldset legend").unwrap().remove();
                update_view();
            });
        });

        /* select a field on both sides and change the color */
        var babel_selected = null,
            orig_babel_select = null;
        $('#babel-edit *[id^=fieldset] .field').click(function () {
            var index = $('#form-target .field').index($(this));
            if (babel_selected) {
                $(babel_selected).addClass('selected');
                $(babel_selected).toggleClass("selected");
                $(orig_babel_select).toggleClass("selected");
                $(orig_babel_select).children('.translator-widget').hide();
            }
            babel_selected = this;
            $(this).toggleClass("selected");
            orig_babel_select = $('#frame-content .field')[index];
            $(orig_babel_select).toggleClass("selected");
            $(orig_babel_select).children('.translator-widget').show();
        });
    

        // Fetch default content
        var initialFetch = $('#trans-selector button.active').data('url');
        // Can be null if not buttons, but the drop-down is present
        if (initialFetch === null) {
            initialFetch = $('#trans-selector select option:selected').val();
        }

        $('#frame-content').load(initialFetch, function () {
            $("#frame-content fieldset legend").unwrap().remove();
            update_view();
        });

        $(".formTabs, .pat-autotoc a").click(sync_elements_vertically);            
        
    });
}(jQuery));
