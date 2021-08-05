#
# Copyright (c) 2017, Joyent, Inc. All rights reserved.
#
# Makefile: top-level Makefile
#
# This Makefile contains only repo-specific logic and uses included makefiles
# to supply common targets (javascriptlint, jsstyle, restdown, etc.), which are
# used by other repos as well.
#

#
# Files
#
CATEST		 = deps/catest/catest
JSL		 = jsl
JSSTYLE		 = jsstyle
JS_FILES	:= $(shell find examples lib -name '*.js')
JSL_FILES_NODE   = $(JS_FILES)
JSSTYLE_FILES	 = $(JS_FILES)
JSL_CONF_NODE	 = jsl.node.conf

# Default target is "check"
check:

test: | $(CATEST)
	$(CATEST) -a

CATEST: deps/catest/.git

include ./Makefile.targ
