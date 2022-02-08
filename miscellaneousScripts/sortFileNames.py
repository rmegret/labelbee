from sys import argv
import csv
import re # Regular expressions

def extractTimestamp(filename):
    splitFileName = re.split("/|_|-|\.",re.sub("_am|_pm|am|pm|_copy","",filename))
    year = splitFileName[-2] if len(splitFileName[-2]) > 1  else '0' + splitFileName[-2]
    day = splitFileName[-3] if len(splitFileName[-3]) > 1 else '0' + splitFileName[-3]
    month = splitFileName[-4] if len(splitFileName[-4]) > 1 else '0' + splitFileName[-4]
    time = splitFileName[-5] if len(splitFileName[-5]) > 3 else '0' + splitFileName[-5]
    return year + month + day + time


 # Read original csv
file = open(argv[1], 'r', newline='')
data = csv.reader(file)

# Extract data
contents = []
for line in data:
    contents.append(line)
file.close()

contents = sorted(contents, key= lambda x: extractTimestamp(x[0]))

# print(contents)

#Create new csv file
newFile = open('sorted_' + argv[1], 'w', newline='')
writer = csv.writer(newFile)

for filename in contents:
    writer.writerow(filename)
newFile.close()