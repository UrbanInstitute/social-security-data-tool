import csv
import json

cr = csv.reader(open("keywords.csv","rU"))

head = cr.next()

output = {}
for row in cr:
  rID = row[0]
  for i in range(1, len(row)):
    if row[i] == "":
      continue
    elif row[i] not in output:
      output[row[i]] = [rID]
    else:
      output[row[i]].append(rID)

with open('keywords.json', 'w') as fp:
  json.dump(output, fp, indent=4, sort_keys=True)