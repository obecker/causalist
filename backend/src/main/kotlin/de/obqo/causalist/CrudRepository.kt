package de.obqo.causalist

interface CrudRepository<Document : Any, HashKey : Any, SortKey : Any> {
    fun save(document: Document): Document
    fun save(documents: Collection<Document>): Collection<Document>
    fun save(vararg document: Document) = save(listOf(*document))
    fun update(hashKey: HashKey, sortKey: SortKey?, updateFn: (Document) -> Document): Document?
    fun get(id: HashKey, sortKey: SortKey? = null): Document?
    fun findAll(): Sequence<Document>
    fun delete(document: Document)
    fun delete(hashKey: HashKey, sortKey: SortKey?)
    fun deleteAll()
}
