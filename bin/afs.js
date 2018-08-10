#!/usr/bin/env node

const program = require('commander');
const request = require('request');
const shelljs = require('shelljs');

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const process = require('process');

program
  // .version(require('../package').version)
  .command('dl <target>')
  .option('-r, --release [version]', 'select the version to be downloaded, empty for latest')
  .option('-x, --extract [path]', 'extract after download, empty for same target as dl')
  .option('-d, --delete', 'delete .zip file')
  .action(function(target, cmd) {

    function handleDelete(f) {
      if(cmd.delete) {
        if(fs.existsSync(f)) {
          shelljs.rm('-r', f);
        }
      }
    }
    function handleExtract(f) {
      
      if(cmd.extract) {
        console.log(cmd.extract);
        var targetDir;
        if(cmd.extract != true) {
          targetDir = cmd.extract;
        } else {
          targetDir = target;
        }

        shelljs.mkdir('-p', targetDir);

        if(fs.existsSync(f)) {
          var x7z = spawn('7z', ['x', f, '-o' + targetDir]);
          x7z.stdout.on('data', (data) => {
            process.stdout.write(data);
          });
          x7z.stderr.on('data', (data) => {
            process.stderr.write(data);
          })
          x7z.on('exit', (code) => {
            handleDelete(f);
          })
        }
      }


    }

    if(cmd.release) {
      console.log('release defined:', cmd.release);

      shelljs.mkdir('-p', target);
      var s = fs.statSync(target);

      if(s.isDirectory) {
        var file = fs.createWriteStream(path.join(target, 'Air-for-Steam-' + cmd.release + '.zip'));
        request({
          url: 'https://api.github.com/repos/Outsetini/Air-for-Steam/zipball/' + cmd.release,
          headers: {
            'User-Agent': 'request'
          }
        }, (err, zipResult, body) => {
          if(err) { console.error(err); return; }

          zipResult.pipe(file);
          console.log('download complete');
          handleExtract(file.path);
        })
      } else {
        throw new Error("target must be a directory");
      }
      var file = fs.createWriteStream(path.join(target, ))
    } else {
      console.log('release undefined, getting latest version');

      request({
        url: 'https://api.github.com/repos/Outsetini/Air-for-Steam/releases/latest',
        headers: {
          'User-Agent': 'request'
        }
      }, (err, httpResult, body) => {
        if(err) { console.error(err); return; }

        console.log(httpResult.statusCode, httpResult.statusMessage);
        if(httpResult.statusCode == 200) {
          try {
            var result = JSON.parse(body);
            console.log("latest version is: ", result.tag_name);

            shelljs.mkdir('-p', target);
            var s = fs.statSync(target);

            if(s.isDirectory()) {
              // target is a directory

              console.log(result.zipball_url);

              var p = path.join(target, 'Air-for-Steam-' + result.tag_name + '.zip');
              var curlProcess = spawn('curl', ['-L', result.zipball_url]);
              var stream = curlProcess.stdout.pipe(fs.createWriteStream(p));
              stream.on('open', () => {
                console.log('opened');
              })
              stream.on('close', () => {
                console.log('closed');
                handleExtract(p);
              })

              // request({
              //   url: result.zipball_url,
              //   headers: {
              //     'User-Agent': 'request'
              //   }
              // }, (err, zipResult, body) => {
              //   if(err) { console.error(err); return; }

              //   var file = fs.createWriteStream(p);
              //   var zipStream = zipResult.pipe(file);
              //   zipStream.on("open", function() {
              //     console.log('download started');
              //   })
              //   zipStream.on("close", function() {
              //     console.log('download complete');
              //     handleExtract(p);
              //   })
              // })
            } else {
              throw new Error("target must be directory");
            }
          } catch (jsonErr) {
            throw jsonErr;
          }
        }
      })
    }
  })

program.parse(process.argv);
