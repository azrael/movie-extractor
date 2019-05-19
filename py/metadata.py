#!/usr/bin/env python
# -*- coding: utf-8 -*-

from sys import argv
from json import loads
from requests import get
from mutagen.mp4 import MP4, MP4Tags, MP4Cover

class DotDict(dict):
	"""dot.notation access to dictionary attributes"""
	__getattr__ = dict.get
	__setattr__ = dict.__setitem__
	__delattr__ = dict.__delitem__

fields = DotDict({
	'name': '\xa9nam',
	'plot': 'desc',
	'date': '\xa9day',
	'genre': '\xa9gen',
	'cover': 'covr',

	# TV show specific fields
	'show': 'tvsh',
	'season': 'tvsn',
	'episode': 'tves'
})

filename = argv[1]
tags = loads(argv[2])

mp4 = MP4(filename)
mp4.delete()
mp4.tags = MP4Tags()

for field, tag in fields.iteritems():
	if field in tags:
		content = tags[field]

		if field == 'cover':
			content = MP4Cover(get(content).content)

		mp4.tags[tag] = content if isinstance(content, list) else [content]

mp4.save()
