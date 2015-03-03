/*
 * Copyright (c) 2015 <name of copyright holder>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function(categories) {
    'use strict';

    function setProfileValue(id, value) {
        localStorage[id] = value;
    }

    function getProfileValue(id) {
        return localStorage[id] || 0;
    }

    function addCategory(description) {
        $.getJSON('/learn', {description: description}, function(results) {
            if (!results.success) {
                return;
            }

            var categories = {};

            categories[results.id] = {
                description: results.description,
                value:       getProfileValue(results.id)
            };

            displayCategories(categories);
        });
    }

    function displayCategories(categories) {
        var template = Handlebars.compile($('#template').html());
        $('#categories').append(template({categories: categories}));

        $('#categories input:radio').change(function() {
            setProfileValue($(this).attr('categoryId'), this.value);
        });
    }

    function clearCategories() {
        $('#categories').empty();
    }

    function refreshCategories() {
        $.getJSON('/categories', function(results) {
            var categories = [];

            _.each(results, function(result) {
                categories.push({
                    id:          result.id,
                    description: result.description,
                    value:       getProfileValue(result.id)
                });
            });

            clearCategories();
            displayCategories(categories);
        });
    }

    function onReady() {
        Handlebars.registerHelper('checkMatch', function(value, options) {
            return new Handlebars.SafeString(value == this.value ? 'checked' : '');
        });

        refreshCategories();

        $('#addCategory').click(function() {
            addCategory($('#newCategory').val());
        });
    }

    $(document).on({
        ajaxStart: function() { $('#spinner').show(); },
        ajaxStop: function() { $('#spinner').hide(); },
        ready: onReady()
    });
})();
