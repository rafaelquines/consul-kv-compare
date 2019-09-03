# consul-kv-compare

`consul-kv-compare` is a command line interface to compare keys between two consul server inside a folder.

Installation
============

```bash
$ npm install -g consul-kv-compare
```

Usage
=====

![Usage](https://media.giphy.com/media/kD5pTs2xXo3lqixRok/giphy.gif)

Examples:

    > consul-kv-compare -a consul-stg.example.com -b consul-prd.example.com -f my-app
    ...

consul-kv-compare usage:

    Usage: consul-kv-compare [options]

    Options:
        -v, --version                  output the version number
        -a, --consulA <url>            URL Consul Server A
        -b, --consulB <url>            URL Consul Server B
        -f, --folderName <folderName>  Consul Folder Name
        -h, --help                     output usage information