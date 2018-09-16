# Restaurant Search #

This project is a prototype semantic search web application that I developed as part of my master's thesis at [Keio
University](http://www.sfc.keio.ac.jp/). I presented the results of my research at [iiWAS
2015](http://www.iiwas.org/conferences/iiwas2015/home) in Brussels, Belgium. My article, titled [Restaurant Search with
Predictive Multispace Queries](https://foosoft.net/projects/restaurant-search/dl/article.pdf) was published in the in the [ACM International Conference Proceeding
Series](https://dl.acm.org/citation.cfm?id=2837185&picked=prox&cfid=817523401&cftoken=92411506).

You can get a better understanding of the goals of this experimental search system by referring to the [overview
presentation](https://foosoft.net/projects/restaurant-search/slides.zip); it provides a brief overview of the points covered in my article. Although I no longer make
the prototype accessible on the web, it is easy to get it up and running locally by following the instructions below.

<iframe width="800" height="500" src="https://www.youtube.com/embed/Ic7Sq-oQ2DI" allowfullscreen></iframe>

## Dependencies ##

*   [Bower](https://bower.io/)
*   [Go](https://golang.org/)
*   [Node.js](https://nodejs.org/)

## Installation ##

1.  Install the search application:

    ```
    $ go get github.com/FooSoft/restaurant-search
    ```

2.  Install the client libraries (from the `search/static` directory):

    ```
    $ bower install
    ```

3.  Build and start the server (from the `search/cmd` directory):

    ```
    $ go build
    $ ./cmd
    ```

4.  Access the web application at `localhost:8080`.

## License ##

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
