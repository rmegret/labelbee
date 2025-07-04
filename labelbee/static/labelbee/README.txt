This is video annotation software for behavior tracking of bees.

Rémi Mégret, 2016-2025
University of Puerto Rico, Río Piedras


Memo usage for gurabo4 videos:

In JS console:
```
videoname='7_02_R_190809100000.cfr.mp4'; 
videoManager.loadVideoManual(`/webapp-test/data/datasets/gurabo4/mp4/col10/${videoname}`);
loadTrackTaggedCSVFromServer(`/webapp-test/data/datasets/gurabo4/tracks/col10/${videoname}.tracks_tagged.csv`);
```