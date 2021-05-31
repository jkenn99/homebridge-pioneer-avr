'use strict';
 
const net = require('net');
const ReadWriteLock = require('rwlock');

const PORT = 23;
const HOST = '127.0.0.1';
 
class TelnetAvr {
 constructor(host, port) {
  this.host = host || HOST;
  this.port = port || PORT;
  this.lock = new ReadWriteLock();
 }
 
 sendMessage(message) {
  var me = this;
  return new Promise((resolve, reject) => {
   me.lock.writeLock(function (release) {
    var socket = net.Socket();
    socket.setTimeout(2000, () => {
     socket.destroy();
     reject(new Error('Cannot connect to AVR ' + me.host));
    });
    socket.once('connect', () => socket.setTimeout(0));
    socket.connect(me.port, me.host, () => {
     if (!this.socket.writable)
      return reject(new Error('Cannot write to AVR socket ' + me.host));
     socket.write(message+'\r');
     require('deasync').sleep(100);
     socket.write(message+'\r');
     if (!message.startsWith('?')) {
      resolve(message + ':SENT');
      socket.end();
      return;
     }
     var messageTimeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Response not received from AVR ' + me.host));
     }, 2000)
    });

    socket.on('close', () => {
     require('deasync').sleep(100);
     release();
    });
 
    socket.on('data', (d) => {
     clearTimeout(messageTimeout);
     let data = d
      .toString()
      .replace('\n', '')
      .replace('\r', '');
     resolve(data);
     socket.end();
    });
 
    socket.on('error', (err) => {
     reject(err);
    });
   });
  });
 }
}
module.exports = TelnetAvr;
