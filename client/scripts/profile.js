/*
 * Copyright (c) 2015 Alex Yatskov <alex@foosoft.net>
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
        var profile = JSON.parse(localStorage.profile || '{}');
        profile[id] = value;
        localStorage.profile = JSON.stringify(profile);
    }

    function getProfileValue(id) {
        var profile = JSON.parse(localStorage.profile || '{}');
        return profile[id] || 0;
    }

    function addCategory(description) {
        $.getJSON('/learn', {description: description}, function(results) {
            if (!results.success) {
                return;
            }

            var categories = [{
                id:          results.id,
                value:       getProfileValue(results.id),
                description: results.description
            }];

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

    function submitCategory() {
        addCategory($('#newCategory').val());
        $('#newCategory').val('');
    }

    $(document).ready(function() {
        Handlebars.registerHelper('checkMatch', function(value, options) {
            return new Handlebars.SafeString(value == this.value ? 'checked' : '');
        });

        refreshCategories();

        $('#addCategory').click(submitCategory);
        $('#newCategory').keyup(function(e) {
            if (e.keyCode == 13) {
                submitCategory();
            }
        });
    });
})();
