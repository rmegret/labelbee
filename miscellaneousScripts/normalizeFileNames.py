from sys import argv
import csv
import re # Regular expressions

"""
Script meant to normalize the names of video files obtained from 
biologists. 

Operates under the assumption that received files have name of the forms:
    datasets/wildbees/mp4/week2-TA/1114am_1-29-18.MP4
    datasets/wildbees/mp4/week2-TA/1105_am_1-29-18.MP4
    datasets/wildbees/mp4/week2-TA/1301pm_1-29-18.MP4
    datasets/wildbees/mp4/week2-TA/1207_pm_1-29-18.MP4
        and variants with time of format HMM

This script will convert names into the following format:
    datasets/wildbees/mp4/week2-TA/week2_TA_180129_1114.mp4
    path/to/file/parent-directory/parent_directory_YYMMDD_HHMM.extension
"""

# Read original csv
file = open(argv[1], 'r', newline='')
data = csv.reader(file)

# Create new csv file
newFile = open('normalized_' + argv[1], 'w', newline='')
writer = csv.writer(newFile)

for line in data:
    # Extract contents of line in csv file
    contents = line

    # Remove am, pm, copy substrings
    contents[0] = re.sub("_am|_pm|am|pm|_copy","",contents[0])

    # Separate string wherever / character is present
    contents[0] = contents[0].split('/')

    # Recreate path
    path = ""
    for j in range(len(contents[0]) - 1):
        path += contents[0][j] + '/'
    
    # Obtain file name sections, remove unwanted characters
    # fileName Index contents:
    #   0 -> parent folder, 1 -> time, 2 -> day, 3 -> month, 4 -> year, 5 -> extension
    fileName = [contents[0][-2].replace('-','_')] + re.split('-|_|\.', contents[0][-1])
    
    # If timestamp indicates a time before 10:00, pad left with zero
    if len(fileName[1]) == 3:
        fileName[1] = '0' + fileName[1]
    
    # If timestamp indicates a day before 10, pad left with zero
    if len(fileName[2]) == 1:
        fileName[2] = '0' + fileName[2]

    # If timestamp indicates a month before 10, pad left with zero
    if len(fileName[3]) == 1:
        fileName[3] = '0' + fileName[3]

    # Create file name
    # This operation depends on a specific format/order for the timestamp information in the original csv.
    # Biologists must provide files with names as denoted in the beginning of this document, otherwise
    # this operation will fail to produce the desired output. 
    fileName = fileName[0] + '_' + fileName[4] + fileName[2] + fileName[3] + '_' + fileName[1] + '.' + fileName[5]
    
    # Join path with file name
    contents[0] = path + fileName

    # Debug output
    # print(contents)

    # Write normalized full path to csv file
    writer.writerow(contents)

# Close csv files
file.close()
newFile.close()