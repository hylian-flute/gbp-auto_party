from ftplib import FTP
import getpass

with FTP('users602.lolipop.jp') as ftp:
  ftp.login('main.jp-charines', getpass.getpass('FTP Password: '))
  file_list = [
    #'index.html',
    #'help.html',
    #'favicon.png',
    'src/encoder.js',
    #'style/style.css',
    'data/items.json',
    #'data/members.json'
  ]
  for path in file_list:
    with open('./' + path, 'rb') as f:
      ftp.storbinary('STOR ./girls-band-party/auto-party-v2/' + path, f)

