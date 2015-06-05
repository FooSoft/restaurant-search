# Restaurant Search with Predictive Multispace Queries #

This work-in-progress represents a prototype semantic search application that I'm developing as part of my master's
thesis at [Keio University](http://www.sfc.keio.ac.jp/). You can get a better understanding of the goals of this system
by referring to the [overview](https://github.com/FooSoft/search-slides/archive/master.zip) presentation. The prototype
is open-source and those who are interested are encouraged to [clone the project](https://github.com/FooSoft/search) and
tinker with it. You may also access a [live snapshot](http://foosoft.net:8080/) of the prototype on my server.

This installation guide is designed with [Ubuntu](http://www.ubuntu.com/)-based distributions in mind (I'm using [Linux
Mint](http://www.linuxmint.com/) for development), but I expect it to be trivial to get this application running on
other flavors of Linux. If you run into any problems, let me know.

## System Dependencies ##

Execute the command `apt-get install package_name` to install the packages listed below (must be root).

*   `mysql-server`
*   `nodejs-legacy`
*   `nodejs`
*   `npm`

In addition to these packages, you will need to have a recent version of the [Go](https://golang.org/project/) compiler
installed on your system to build and execute the server code. The easiest way to get the latest version is to use the
[godeb](https://github.com/niemeyer/godeb) tool to install it for you. After downloading the appropriate binary package,
execute the `./godeb install` command to do this. Once you have the Go environment configured on your computer, you can
install this package by executing the following command:

`go get github.com/FooSoft/search`

## Global Node.js Dependencies ##

Execute the command `npm install -g package_name` to install the packages listed below (must be root).

*   `bower`

## Database Initialization ##

1.  Execute `./db/init.sh` to create the required database and associated user. You will be prompted for the mysql root
    password; if you do not have one configured you may proceed by inputting an empty string.
2.  Load the initial data tables by running `./db/load.sh`. You may perform this step again at a later time if you wish
    to reset the contents of the database to their original state.

## Client and Server Initialization ##

1.  From the `static` directory, execute the command `bower install`.
2.  From the base directory, build the server with the command `go build`.
3.  From the base directory, launch the server by launching the `server` executable.
4.  You should now be able to access the web application at [localhost:8080](http://localhost:8080).
