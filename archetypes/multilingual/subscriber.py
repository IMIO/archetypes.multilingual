# -*- coding: utf-8 -*-
from archetypes.multilingual.interfaces import IArchetypesTranslatable
from plone.app.multilingual.interfaces import ILanguage
from plone.app.multilingual.interfaces import ILanguageIndependentFieldsManager
from plone.app.multilingual.interfaces import ITranslationManager
from plone.app.multilingual.subscriber import CreationEvent
from plone.dexterity.interfaces import IDexterityContent
from plone.memoize import ram
from zope.component import queryAdapter
from zope.event import notify
from zope.globalrequest import getRequest
from zope.lifecycleevent import Attributes
from zope.lifecycleevent import ObjectModifiedEvent
from zope.lifecycleevent.interfaces import IObjectModifiedEvent
from zope.lifecycleevent.interfaces import IObjectRemovedEvent


class LanguageIndependentModifier(object):
    """Class to handle archetypes editions."""

    stack = []

    def __call__(self, content, event):
        """Called by the event system."""
        if IArchetypesTranslatable.providedBy(content):
            if IObjectModifiedEvent.providedBy(event):
                self.handle_modified(content)

    def handle_modified(self, content):
        canonical = ITranslationManager(content).query_canonical()
        if canonical in self.stack:
            return
        else:
            self.stack.append(canonical)

            # Copy over all language independent fields
            translations = self.get_all_translations(content)
            manager = ILanguageIndependentFieldsManager(content)
            for translation in translations:
                manager.copy_fields(translation)

            schema = content.Schema()
            descriptions = Attributes(schema)
            self.reindex_translations(translations, descriptions)
            self.stack.remove(canonical)

    def reindex_translations(self, translations, descriptions):
        """Once the modifications are done, reindex all translations"""
        for translation in translations:
            translation.reindexObject()
            notify(ObjectModifiedEvent(translation, descriptions))

    def get_all_translations(self, content):
        """Return all translations excluding the just modified content"""
        translations_list_to_process = []
        content_lang = queryAdapter(content, ILanguage).get_language()
        canonical = ITranslationManager(content)
        translations = canonical.get_translations()

        for language in translations.keys():
            if language != content_lang:
                translations_list_to_process.append(translations[language])
        return translations_list_to_process

handler = LanguageIndependentModifier()


class ArchetypesCreationEvent(CreationEvent):

    @property
    def is_translatable(self):
        return (not IObjectRemovedEvent.providedBy(self.event)
                and not IDexterityContent.providedBy(self.obj))

    def get_translation_info(self):
        key = self.event.oldName or self.event.newName
        return self._cached_info(key)

    def cache_key(fun, self, key):
        return key

    @ram.cache(cache_key)
    def _cached_info(self, key):
        request = getattr(self.event.object, 'REQUEST', getRequest())
        info = {'tg': request.get('tg'),
                'source_language': request.get('source_language')}
        if not info.get('tg') or not info.get('source_language'):
            raise AttributeError
        return info


archetypes_creation_handler = ArchetypesCreationEvent()
