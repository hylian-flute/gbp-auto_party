import urllib.request
import json
from ftplib import FTP
import getpass

# CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRCRL35m00_cyQM9ulKfItHfOy2dBquQlOLDjpMbbqH4CfqtDNXz0S1YLYhccTK4b_8C-XOHxQcGfG/pub?gid=0&single=true&output=csv'
CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRCRL35m00_cyQM9ulKfItHfOy2dBquQlOLDjpMbbqH4CfqtDNXz0S1YLYhccTK4b_8C-XOHxQcGfG/pub?gid=478276553&single=true&output=csv'

str_data = None
with urllib.request.urlopen(CSV_URL) as f:
  str_data = f.read().decode('utf-8')

data_matrix = [row.split(',') for row in str_data.split('\n')]
score_up_time_arr_dict = {
  '5': [3, 3.5, 4, 4.5, 5],
  '7': [5, 5.5, 6, 6.5, 7],
  '7.5': [5, 5.6, 6.2, 6.8, 7.5],
  '8': [5, 5.7, 6.4, 7.2, 8],
}
data_arr = []
for row in data_matrix:
  data_arr.append({
    'id': int(row[0]),
    'name': row[1],
    'character': int(row[2]),
    'rarity': int(row[3]) - 1,
    'type': int(row[4]),
    'parameters': [int(value) for value in row[5:8]],
    'scoreUpRate': float(row[8]),
    'scoreUpRateHigh': float(row[9]),
    'highCondition': int(row[10]),
    'scoreUpTimeArr': score_up_time_arr_dict[row[11]],
  })

with open('./data/members.json', 'w', encoding='utf-8') as f:
  f.write(json.dumps(data_arr, ensure_ascii=False))

#with FTP('users602.lolipop.jp') as ftp:
#  ftp.login('main.jp-charines', getpass.getpass('FTP Password: '))
#  with open('./data/members.json', 'rb') as f:
#    ftp.storbinary('STOR ./girls-band-party/auto-party-v2/data/members.json', f)
#  with open('./help.html', 'rb') as f:
#    ftp.storbinary('STOR ./girls-band-party/auto-party-v2/help.html', f)
