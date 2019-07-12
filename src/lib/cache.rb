# A really simple MRU cache, especially for session[:id] so we don't have
# to go to Couch to get the account information.
#
# In you Sinatra app, simple declare this in your application
#
# def self.cache
#    @@cache ||= Mu::Cache.new :max_size => 1024, :max_time => 30.0
# end
#
# and then wrap your cachable Couch-queries or HAML fragments with
#
# Application.cache.fetch session[:id] do
#     couch.get session[:id] rescue nil
# end
module Mu
class Cache
    # Each entry in the cache that simultaneously exists both in the
    # hash as well in the list below giving us O(1) deletes
    class Entry
        attr_accessor :key, :val, :next, :prev, :time

        def initialize key=nil, val=nil
            @time = Time.now
            @key = key
            @val = val
        end

        def inspect
            "#<Cache::Entry #{key}=#{val}>"
        end
    end

    # A simple doubly-linked list of entries with basic operations to
    # push/pop/shift and delete a specific entry.
    class List
        attr_reader :head
        attr_reader :tail

        def push entry
            if not @tail
                @head = @tail = entry
            else
                @tail.next = entry
                entry.prev = @tail
                entry.next = nil
                @tail = entry
            end
        end

        alias_method :<<, :push

        def pop
            return nil if not @tail

            entry = @tail
            @tail = entry.prev
            if @tail
                @tail.next = nil
            else
                @head = nil
            end

            entry.next = nil
            entry.prev = nil
            return entry
        end

        def shift
            return nil if not @head

            entry = @head
            @head = entry.next
            if @head
                @head.prev = nil
            else
                @tail = nil
            end

            entry.next = nil
            entry.prev = nil
            return entry
        end

        def delete entry
            if not entry.prev and not entry.next
                @head = @tail = nil
                return
            end

            if not entry.prev and entry.next
                @head = entry.next
                entry.next.prev = nil
                entry.next = nil
                return
            end

            if entry.prev and not entry.next
                @tail = entry.prev
                entry.prev.next = nil
                entry.prev = nil
                return
            end

            entry.prev.next = entry.next
            entry.next.prev = entry.prev
            entry.next = nil
            entry.prev = nil
        end

        def clear
            @head = @tail = nil
        end
    end

    attr_reader :max_size, :max_time

    def initialize opts={}
        @max_size = opts.fetch :max_size, 1024
        @max_time = opts.fetch :max_time, 1.0
        @hash = Hash.new
        @list = List.new
    end

    def clear
        hash.clear
        list.clear
    end

    def size
        hash.size
    end

    # Forcefully delete an entry from the cache. Returns the value of the
    # deleted key, if one exists.
    def delete key
        entry = hash.delete key
        if entry
            list.delete entry
            return entry.val
        end
        return nil
    end

    # Store the key => val into the cache. If it's already there, then just
    # update the entry and move it to the back. Otherwise insert a new
    # entry and move it to the back
    def store key, val
        purge
        entry = hash[key]
        if entry
            update entry, val
        else
            insert key, val
        end
        return val
    end
    
    def member? key
        purge
        hash.member? key
    end

    alias_method :[]=, :store

    # Look up the key in the cache and if it's there refresh it. Otherwise
    # yield to get the value and insert that into the cache. The usage is
    # as follows:
    # val = cache.fetch key do
    #     some expensive operation that returns val
    # end
    def fetch key, refresh=true, &block
        purge
        entry = hash[key]

        if entry
            update entry if refresh
            return entry.val
        end

        val = yield rescue nil
        return if not val

        insert key, val
        return val
    end

    private

    # If the cache is getting too long, then remove the oldest entry (which
    # is in the front of the list)
    def purge opts={}
        size = opts.fetch :max_size, @max_size
        time = opts.fetch :max_time, @max_time

        # Make sure that the cache doesn't grow beyond a certain size, no
        # matter how recent the entries are
        hash.delete list.shift.key while hash.size > size

        # Then purge entries in the list that've been there longer than a
        # certain duration
        now = Time.now
        while not hash.empty? and now - list.head.time >= time
            hash.delete list.shift.key
        end
    end

    # Update an entry with an optionally new value. This moves the the
    # entry to the back of the queue so that it doesn't "expire" during
    # the next purge. This also assumes that the entry is not present
    # in the cache.
    def update entry, val=nil
        entry.time = Time.now
        entry.val = val if val
        list.delete entry
        list << entry
        return entry
    end

    # Inserts a new entry to the "back" of the queue. This assumes that
    # the entry does not already exist in the hash
    def insert key, val
        entry = Entry.new(key, val)
        hash[key] = entry
        list << entry
        return entry
    end

    attr_reader :hash, :list
end
end # Mu