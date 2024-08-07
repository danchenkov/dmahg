const summaryInclude = 60
const fuseOptions = {
    shouldSort: true,
    includeMatches: true,
    threshold: 0.0,
    tokenize: true,
    location: 0,
    distance: 400,
    maxPatternLength: 64,
    minMatchCharLength: 1,
    keys: [
        { name: 'title', weight: 0.4 }, { name: 'contents', weight: 0.3 }, { name: 'tags', weight: 0.25 }, { name: 'categories', weight: 0.15 }
    ]
}

let inputBox = document.getElementById('search-query')
if (inputBox !== null) {
    let searchQuery = param("q")
    let searchResults = document.getElementById('search-results')
    if (searchQuery) {
        inputBox.value = searchQuery || ""
        executeSearch(searchQuery, false)
    } else if (searchResults) {
        searchResults.innerHTML = '<p class="search-results-empty">Please enter a word or phrase above, or see <a href="/tags/">all tags</a>.</p>'
    }
}

function executeSearch(searchQuery) {

    show(document.querySelector('.search-loading'))

    fetch('/index.json').then(function (response) {
        if (response.status !== 200) {
            console.log('Looks like there was a problem. Status Code: ' + response.status)
            return
        }
        // Examine the text in the response
        response.json().then(function (pages) {
            let fuse = new Fuse(pages, fuseOptions)
            let result = fuse.search(searchQuery)
            if (result.length > 0) {
                populateResults(result)
            } else {
                document.getElementById('search-results').innerHTML = '<p class="search-results-empty">No matches found</p>'
            }
            hide(document.querySelector('.search-loading'))
        })
            .catch(function (err) {
                console.log('Fetch Error :-S', err)
            })
    })
}

function populateResults(results) {

    let searchQuery = document.getElementById("search-query").value
    let searchResults = document.getElementById("search-results")

    // pull template from hugo template definition
    let templateDefinition = document.getElementById("search-result-template").innerHTML

    results.forEach(function (value, key) {

        let contents = value.item.contents
        let snippet = ""
        let snippetHighlights = []

        snippetHighlights.push(searchQuery)
        snippet = contents.substring(0, summaryInclude * 2) + '&hellip;'

        //replace values
        let tags = ""
        if (value.item.tags) {
            value.item.tags.forEach(function (element) {
                tags = tags + "<a href='/tags/" + element + "'>" + "#" + element + "</a> "
            })
        }

        let output = render(templateDefinition, {
            key: key,
            title: value.item.title,
            link: value.item.permalink,
            tags: tags,
            categories: value.item.categories,
            snippet: snippet
        })
        searchResults.innerHTML += output

        snippetHighlights.forEach(function (snipvalue, snipkey) {
            var instance = new Mark(document.getElementById('summary-' + key))
            instance.mark(snipvalue)
            let s = snipkey
            snipkey = s
        })

    })
}

function render(templateString, data) {
    let conditionalMatches, conditionalPattern, copy
    conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g
    //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
    copy = templateString
    while ((conditionalMatches = conditionalPattern.exec(templateString)) !== null) {
        if (data[conditionalMatches[1]]) {
            //valid key, remove conditionals, leave contents.
            copy = copy.replace(conditionalMatches[0], conditionalMatches[2])
        } else {
            //not valid, remove entire section
            copy = copy.replace(conditionalMatches[0], '')
        }
    }
    templateString = copy
    //now any conditionals removed we can do simple substitution
    let key, find, re
    for (key in data) {
        find = '\\$\\{\\s*' + key + '\\s*\\}'
        re = new RegExp(find, 'g')
        templateString = templateString.replace(re, data[key])
    }
    return templateString
}

// Helper Functions
function show(elem) {
    if (elem) { elem.style.display = 'block' }
}
function hide(elem) {
    if (elem) { elem.style.display = 'none' }
}
function param(name) {
    return decodeURIComponent((location.search.split(name + '=')[1] || '').split('&')[0]).replace(/\+/g, ' ')
}
