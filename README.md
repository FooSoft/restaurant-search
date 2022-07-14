# Restaurant Search

This project is a prototype semantic search web application that I developed as part of my master's thesis at [Keio
University](http://www.sfc.keio.ac.jp/). I presented the results of my research at [iiWAS
2015](http://www.iiwas.org/conferences/iiwas2015/home) in Brussels, Belgium. My article, titled [Restaurant Search with
Predictive Multispace Queries](dl/article.pdf) was published in the in the [ACM International Conference Proceeding
Series](https://dl.acm.org/citation.cfm?id=2837185&picked=prox&cfid=817523401&cftoken=92411506). The video below
demonstrates the web application in action:

<iframe width="800" height="500" src="https://www.youtube.com/embed/Ic7Sq-oQ2DI" allowfullscreen></iframe>

You can get a better understanding of the goals of this experimental search system by referring to the [overview
presentation](dl/slides.zip); it provides a brief overview of the points covered in my article. Although I no longer
make the prototype accessible on the web, it is easy to get it up and running locally by following the instructions
below.

## Installation

1.  Install the dependencies: [Bower](https://bower.io/), [Go](https://golang.org/), and [Node.js](https://nodejs.org/).
2.  Install the search application:
    ```
    $ go install foosoft.net/projects/restaurant-search@latest
    ```
3.  Install the client libraries (from the `search/static` directory):
    ```
    $ bower install
    ```
4.  Build and start the server (from the `search/cmd` directory):
    ```
    $ go build
    $ ./cmd
    ```
5.  Access the web application at `localhost:8080`.
