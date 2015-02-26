# -*- coding: utf-8 -*-
from archetypes.multilingual.testing import \
    ARCHETYPESMULTILINGUAL_FUNCTIONAL_TESTING
from archetypes.multilingual.testing import optionflags
from plone.testing import layered

import doctest
import unittest

functionnal_tests = [
    'languageindependentfields.txt',
    'multilingual.txt',
]


def test_suite():
    return unittest.TestSuite([
        layered(
            doctest.DocFileSuite(
                filename,
                package='archetypes.multilingual.tests',
                optionflags=optionflags
            ),
            layer=ARCHETYPESMULTILINGUAL_FUNCTIONAL_TESTING
        ) for filename in functionnal_tests
    ])


if __name__ == '__main__':
    unittest.main(defaultTest='test_suite')
