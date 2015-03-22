# Reactive Search

This work-in-progress represents a prototype semantic search application that I'm developing as part of my master's
thesis at [Keio University](http://www.sfc.keio.ac.jp/). You can get a better understanding of the goals of this system
by referring to the [overview](overview/) presentation. The prototype is open-source and those who are interested are
encouraged to [clone the project](https://github.com/FooSoft/search) and tinker with it. You may also access a [live
snapshot](http://foosoft.net:3000/) of the prototype on my server.

This installation guide is designed with [Ubuntu](http://www.ubuntu.com/)-based distributions in mind (I'm using [Linux
Mint](http://www.linuxmint.com/) for development), but I expect it to be trivial to get this application running on
other flavors of Linux. If you run into any problems, let me know.

## System Dependencies

Execute the command `apt-get install package_name` to install the packages listed below (must be root).

*   `mysql-server`
*   `nodejs`
*   `nodejs-legacy`
*   `npm`

## Global Node.js Dependencies

Execute the command `npm install -g package_name` to install the packages listed below (must be root).

*   `gulp`
*   `bower`

## Database Initialization

1.  Execute `./db/init.sh` to create the required database and associated user. You will be prompted for the mysql root
    password; if you do not have one configured you may proceed by inputting an empty string.
2.  Load the initial data tables by running `./db/load.sh`. You may perform this step again at a later time if you wish
    to reset the contents of the database to their original state.

## Client and Server Initialization

1.  From the application base directory execute the command `npm install`.
2.  Still in the same directory, execute the command `gulp install`.
3.  Execute the command `gulp` to start the application HTTP server (default port is 3000).
4.  You should now be able to access the web application at [localhost:3000](http://localhost:3000).
