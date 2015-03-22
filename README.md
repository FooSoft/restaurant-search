# Reactive Search Prototype


## Introduction

This installation guide is designed for Linux distributions based on Ubuntu. It should be trivial to get this
application running on other Linux flavors, but you may have to install different packages to satisfy the dependencies.


## System Dependencies

Execute the command `apt-get install package_name` to install these packages (must be root).

*   `mysql-server`
*   `nodejs`
*   `nodejs-legacy`
*   `npm`


## Global Node.js Dependencies

Execute the command `npm install -g package_name` to install these packages (must be root).

*   `gulp`
*   `bower`


## Database Initialization

1.  Execute `./db/init.sh` to create the required database and associated user. You will be prompted for the mysql root
    password; if you do not have one configured you may continue by inputting an empty string.
2.  Load the initial data tables by running `./db/load.sh`. You may perform this step again at a later time if you wish
    to reset the contents of the database to their original state.


## Client and Server Initialization

1.  From the application base directory execute the command `npm install`.
2.  While in the same directory execute the command `gulp install`.
3.  Execute the command `gulp` to start the application HTTP server on port 3000.
