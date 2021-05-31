'use strict';
 
const net = require('net');
const ReadWriteLock = require('rwlock');

const PORT = 23;
const HOST = '127.0.0.1';
 
class TelnetAvr {
 constructor(host, port, log) {
  this.host = host || HOST;
  this.port = port || PORT;
  this.lock = new ReadWriteLock();
  this.log = log;
 }
 
 sendMessage(message) {
  var me = this;
  var messageTimeout;
  return new Promise((resolve, reject) => {
   me.lock.writeLock(function (release) {
    var socket = net.createConnection(me.port, me.host, () => {
     if (!socket.writable)
      return reject(new Error('Cannot write to AVR socket ' + me.host));
     socket.write(message+'\r');
     socket.write(message+'\r\n');
     if (!message.startsWith('?')) {
      resolve(message + ':SENT');
      socket.end();
      return;
     }
     messageTimeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Response not received from AVR ' + me.host));
     }, 2000)
    });
    socket.setTimeout(2000, () => {
     socket.destroy();
     reject(new Error('Cannot connect to AVR ' + me.host));
    });
    socket.once('connect', () => socket.setTimeout(0));

    socket.on('close', () => {
     release();
    });

    socket.on('drain', () => {
     if (messageTimeout)
      clearTimeout(messageTimeout);
    });
    
    socket.on('data', (d) => {
     let data = d
      .toString()
      .replace('\n', '')
      .replace('\r', '');
     resolve(data);
     socket.end();
     me.log.debug('Message complete: sent ' + message + '; received ' + data);
    });
 
    socket.on('error', (err) => {
     reject(err);
    });
   });
  });
 }
}
module.exports = TelnetAvr;
