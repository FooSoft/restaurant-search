# Restaurant Search #

This work-in-progress represents a prototype semantic search web application that I'm developing as part of my master's
thesis at [Keio University](http://www.sfc.keio.ac.jp/). You can get a better understanding of the goals of my research
by referring to the [overview presentation](https://foosoft.net/projects/restaurant-search/slides). Although I no longer make the prototype accessible on the web, it
is easy to get it up and running locally.

<iframe width="800" height="500" src="https://www.youtube.com/embed/Ic7Sq-oQ2DI" frameborder="0" allowfullscreen></iframe>

## Dependencies ##

*   [Bower](https://bower.io/)
*   [Go](https://golang.org/)
*   [Node.js](https://nodejs.org/)

## Installation ##

1.  Install the search application:

    ```
    $ go get github.com/FooSoft/search
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

MIT
