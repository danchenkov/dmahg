const summaryInclude = 60
const fuseOptions = {
    shouldSort: true,
    includeMatches: true,
    threshold: 0.0,
    tokenize: true,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: [
        { name: 'title', weight: 0.8 }, { name: 'contents', weight: 0.5 }, { name: 'tags', weight: 0.3 }, { name: 'categories', weight: 0.3 }
    ]
}

const searchQuery = param('s')
if (searchQuery) {
    $('#search-query').val(searchQuery)
    executeSearch(searchQuery)
} else {
    $('#search-results').append('<p>Введите слово или фразу</p>')
}

function executeSearch(searchQuery) {
    $.getJSON('/index.json', function (data) {
        const pages = data
        const fuse = new Fuse(pages, fuseOptions)
        const result = fuse.search(searchQuery)
        console.log({ matches: result })
        if (result.length > 0) {
            populateResults(result)
        } else {
            $('#search-results').append('<p>Поиск результатов не дал…</p>')
        }
    })
}

function populateResults(result) {
    $.each(result, function (key, value) {
        const contents = value.item.contents
        let snippet = ''
        const snippetHighlights = []
        // const tags = []
        let start, end
        if (fuseOptions.tokenize) {
            snippetHighlights.push(searchQuery)
        } else {
            $.each(value.matches, function (matchKey, mvalue) {
                if (mvalue.key === 'tags' || mvalue.key === 'categories') {
                    snippetHighlights.push(mvalue.value)
                } else if (mvalue.key === 'contents') {
                    start = mvalue.indices[0][0] - summaryInclude > 0 ? mvalue.indices[0][0] - summaryInclude : 0
                    end = mvalue.indices[0][1] + summaryInclude < contents.length ? mvalue.indices[0][1] + summaryInclude : contents.length
                    snippet += contents.substring(start, end)
                    snippetHighlights.push(mvalue.value.substring(mvalue.indices[0][0], mvalue.indices[0][1] - mvalue.indices[0][0] + 1))
                }
            })
        }

        if (snippet.length < 1) {
            snippet += contents.substring(0, summaryInclude * 2)
        }
        // pull template from hugo templarte definition
        const templateDefinition = $('#search-result-template').html()
        // replace values
        const output = render(templateDefinition, { key: key, title: value.item.title, link: value.item.permalink, tags: value.item.tags, categories: value.item.categories, snippet: snippet })
        $('#search-results').append(output)

        $.each(snippetHighlights, function (snipkey, snipvalue) {
            $('#summary-' + key).mark(snipvalue)
        })
    })
}

function param(name) {
    return decodeURIComponent((location.search.split(name + '=')[1] || '').split('&')[0]).replace(/\+/g, ' ')
}

function render(templateString, data) {
    let conditionalMatches, copy
    const conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g
    // since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
    copy = templateString
    while ((conditionalMatches = conditionalPattern.exec(templateString)) !== null) {
        if (data[conditionalMatches[1]]) {
            // valid key, remove conditionals, leave contents.
            copy = copy.replace(conditionalMatches[0], conditionalMatches[2])
        } else {
            // not valid, remove entire section
            copy = copy.replace(conditionalMatches[0], '')
        }
    }
    templateString = copy
    // now any conditionals removed we can do simple substitution
    let key, find, re
    for (key in data) {
        find = '\\$\\{\\s*' + key + '\\s*\\}'
        re = new RegExp(find, 'g')
        templateString = templateString.replace(re, data[key])
    }
    return templateString
}
