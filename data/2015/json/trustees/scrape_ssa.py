from __future__ import division
from bs4 import BeautifulSoup
import urllib2, json, math, copy, bs4, sys, re

url_frags = [ 'lr4b1', 'lr4b2', 'lr4b3', 'lr4b4', 'lr5a1', 'lr5a2', 'lr5a3', 'lr5a4', 'lr5b1', 'lr5b2', 'lr5c4', 'lr5c5', 'lr5c7', 'lr6g2', 'lr6g4', 'lr6g5', 'lr6g6', 'lr6g7', 'lr6g8', 'lr6g9', 'lr6g10' ]

# url = sys.argv[1]
for frag in url_frags:

    url = "https://www.socialsecurity.gov/OACT/TR/2016/%s.html"%frag
    soup = BeautifulSoup( urllib2.urlopen( url ), 'html5lib' )

    # Data is in every table but the first
    tables = soup( 'table' )[ 1 : ]

    # For debugging
    json_dicts = []

    for ti in range( len( tables ) ):

        table = tables[ ti ]

        # Add category to json dict
        json_dict = { 'category' : 'timeSeries' }

        def cleanup( text ):
            text = text.replace( "\n", ' ' ) # remove newlines
            text = text.replace( u'\xa0', ' ' ) # remove &nbsp;s
            text = re.sub( ' +', ' ', text ) # turn multiple spaces into one space
            return text.strip() # strip leading and trailing spaces

        # For when we add a row but later it is shown to be a subtable
        added_row_without_subtable = False


        ########## Footnotes ##########

        # Add footnotes to json dict
        json_dict[ 'footnotes' ] = []

        # Add all footnotes by index in footnote_indexes to json_dict
        def addNotes( json_dict, footnote_indexes ):

            ii = 0

            for footnote_dict in json_dict[ 'footnotes' ]:

                # Get end index
                if ii + 2 < len( footnote_indexes ):
                    end = footnote_indexes[ ii + 2 ]
                else:
                    end = -1

                content = footnotes[ footnote_indexes[ ii + 1 ] : end ]
                #content = content.replace( "\n", ' ' ).strip()

                footnote_dict[ 'content' ] = cleanup( content )

                if footnote_dict.get( 'symbol' ):
                    footnote_dict[ 'type' ] = 'footnote'
                else:
                    footnote_dict[ 'type' ] = 'note'

                ii = ii + 2


        # Special case
        if 'lr6g9' in url or 'lr6g10' in url:
            json_dict[ 'footnotes' ].append( {'content': u'Between -$500 million and $500 million.', 'symbol': u'a', 'type': 'footnote'})

            json_dict[ 'footnotes' ].append( {'content': u'Totals do not necessarily equal the sums of rounded components.', 'type': 'note'} )

        # If there is small text, get footnotes
        elif soup( 'small' ):

            # Get footnotes soup
            footnotes = soup( 'small' )[ -1 ]

            # Get sups
            sups = footnotes( 'sup' )

            # Get footnotes text
            footnotes = footnotes.text

            footnote_indexes = []

            # The following assumes the footnotes come in the order a, b, c, 1, 2, 3

            # Find indices of all footnotes with footnote symbols (a, b, c)
            for sup in sups:

                footnote_dict = {}

                if footnote_indexes:
                    start = footnote_indexes[-1]
                else:
                    start = 0

                i = footnotes.find( "\n" + sup.text, start )
                footnote_indexes.append( i ) # index including the footnote symbol
                footnote_indexes.append( i + 2 ) # index after the footnote symbol

                footnote_dict[ 'symbol' ] = sup.text

                json_dict[ 'footnotes' ].append( footnote_dict )

            n = 1

            # Find indices of all numbered footnotes
            while True:
                if footnote_indexes:
                    start = footnote_indexes[-1]
                else:
                    start = 0

                i = footnotes.find( "\n" + str(n) + '.', start )

                # Break if there is no footnote with that number
                if i == -1:
                    break

                # Otherwise append the index
                if n == 1:
                    # If it is the first one, get rid of 'Notes:'
                    footnote_indexes.append( i - 7 )
                else:
                    footnote_indexes.append( i )

                footnote_indexes.append( i )

                json_dict[ 'footnotes' ].append( {} ) # append empty footnote dict

                n = n + 1

            if footnote_indexes:
                start = footnote_indexes[-1]
            else:
                start = 0

            note_index = footnotes.find( "\nNote", start )

            # If there were no numbered footnotes, add 'Note(s):'
            if n == 1 and note_index != -1:
                footnote_indexes.append( note_index ) # index including 'Note(s):'
                footnote_indexes.append( note_index + 7 ) # index after 'Note(s):'

                json_dict[ 'footnotes' ].append( {} ) # append empty footnote dict

            addNotes( json_dict, footnote_indexes )



        ########## Html ##########

        json_dict[ 'html' ] = {}

        # Generate appropriate html string given an element
        def generateHtmlString( element ):

            # Creating a new tag with exactly what we need
            tag = soup.new_tag( element.name )

            # Add the appropriate content to the tag
            for child in element.children:

                if isinstance( child, bs4.element.NavigableString ):
                    tag.contents.append( bs4.element.NavigableString( cleanup( child ) ) )

                # If it is a footnote
                elif child.name == 'small' or child.name == 'a':
                    symbol = cleanup( child.text )

                    symbol_tag = soup.new_tag( 'span' )
                    symbol_tag[ 'class' ] = 'top_footnote top_' + symbol
                    symbol_tag.string = symbol

                    tag.contents.append( symbol_tag )

                elif child.name == 'span':
                    span_tag = soup.new_tag( 'span' )
                    span_tag.string = child.text
                    tag.contents.append( span_tag )

                elif child.name == 'br':
                    tag.contents.append( child )

                else:
                    print "Unexpected element found:", child

            class_list = []

            # Add 'series' and 'colN' classes
            if element.name == 'th':
                class_list.append( 'series' )

            if element.get( 'class' ):
                for c in element[ 'class' ]:
                    if re.match( 'col\d', c ):
                        class_list.append( c )

            if class_list:
                tag[ 'class' ] = ' '.join( class_list )

            # Add colspans and rowspans
            if element.get( 'colspan' ):
                tag[ 'colspan' ] = element[ 'colspan' ]

            if element.get( 'rowspan' ):
                tag[ 'rowspan' ] = element[ 'rowspan' ]

            return str( tag )


        def addRowToHtml( row, section ):

            # If we are trying to add a row with no previous body
            if section == 'body' and not json_dict[ 'html' ].get( 'body' ):

                # Set added row without subtable variable
                global added_row_without_subtable
                added_row_without_subtable = True

                # Then start a new body
                json_dict[ 'html' ][ 'body' ] = '<tbody>'

            json_dict[ 'html' ][ section ] += '<tr>'

            # Add contents of row to html
            for child in row.children:

                # If child is not a tag, skip it
                if not isinstance( child, bs4.element.Tag ):
                    continue

                # Else add its string to the header html
                json_dict[ 'html' ][ section ] += generateHtmlString( child )

            json_dict[ 'html' ][ section ] += '</tr>'



        ########## Data ##########

        json_dict[ 'data' ] = {}

        # Get type given table column index
        def getType( i ):

            # If there is small text at all
            if soup.small:

                # Assume the first one is the tagline
                tagline = soup.small.text

                if 'percent' in tagline:
                    return 'percent'

                if 'billion' in tagline:
                    return 'dollarBillion'

            if 'lr4b3' in url or 'lr5a2' in url:
                if i >= 5:
                    return 'number'
                else:
                    return 'numberThousand'

            if 'lr5b1' in url:
                if i != 7:
                    return 'percent'

            if 'lr5b2' in url:
                if i >= 2 and i <= 4:
                    return 'percent'

            if 'lr5c4' in url:
                return 'numberThousand'

            if 'lr5c5' in url:
                if i == 1 or i == 4:
                    return 'numberThousand'

            if 'lr5c7' in url:
                if i > 1:
                    return 'dollar'

            if 'lr6g4' in url:
                if i == 10:
                    return 'numberBillion'
                else:
                    return 'percent'
                    
            if 'lr6g6' in url:
                if i == 1:
                    return 'dollar'
                elif i >= 3 and i <= 4:
                    return 'dollarBillion'

            return 'number'


        header_rows = []

        # Get the header text, with proper regard for line breaks and superscripts
        def getHeaderText( th ):

            # If th is None, return None
            if not th:
                return None

            text_list = []

            for c in th.contents:
                if isinstance( c, bs4.element.NavigableString ):
                    text_list.append( c )
                elif c.name == 'span':
                    text_list.append( c.text )

            return cleanup( ' '.join( text_list ) ).replace( '- ', '-' )


        # Start creating html header
        json_dict[ 'html' ][ 'header' ] = '<thead>'


        # If there is a head
        if table.thead:
            trs = table.thead( 'tr' )
        # Otherwise
        else:
            if 'lr5c7' in url:
                trs = table( 'tr' )[ : 2 ]


        # For each row in the table header
        for tri in range( len( trs ) ):

            tr = trs[ tri ]

            header_row = []

            is_lastrow = tri == len( trs ) - 1

            # Rearrange the th elements to match the actual displayed rows
            if not is_lastrow:

                # lr4b1 OK
                # lr4b2 OK
                if 'lr4b3' in url or 'lr5c7' in url:
                    # None + third header (index 2)
                    ths = [ None ] + tr( 'th' )[ 2 : 3 ]
                # lr4b4 OK
                elif 'lr5a1' in url:
                    # None + third and fourth headers (index 2 through 3)
                    ths = [ None ] + tr( 'th' )[ 2 : 4 ]
                elif 'lr5a2' in url:
                    # second and third headers (index 1 through 2)
                    ths = tr( 'th' )[ 1 : 3 ]
                # lr5a3 OK
                # lr5a4 OK
                # lr5b1 OK
                elif 'lr5b2' in url:
                    # None + second and third headers (index 1 through 2)
                    ths = [ None ] + tr( 'th' )[ 1 : 3 ]
                # lr5c4 OK
                elif 'lr5c5' in url:
                    # None + third header (index 2) + None + fifth header (index 4)
                    ths = [ None ] + tr( 'th' )[ 2 : 3 ] + [ None ] + tr( 'th' )[ 4 : 5 ]
                # lr5c7 above
                # lr6g* OK
                else:
                    ths = tr( 'th' )
            else:

                # lr4b1 OK
                # lr4b2 OK
                if 'lr4b3' in url:
                    # first two elements of first row + all elements of second row + last two elements of first row
                    ths = trs[0]( 'th' )[ : 2 ] + tr( 'th' ) + trs[0]( 'th' )[ -2 : ]
                # lr4b4 OK
                elif 'lr5a1' in url:
                    # first two elements of first row + all elements of second row
                    ths = trs[0]( 'th' )[ : 2 ] + tr( 'th' )
                elif 'lr5a2' in url:
                    # first element of first row + all elements of second row
                    ths = trs[0]( 'th' )[ : 1 ] + tr( 'th' )
                # lr5a3 OK
                # lr5a4 OK
                # lr5b1 OK
                elif 'lr5b2' in url:
                    # first element of second row + first element of first row + rest of elements of second row
                    ths = tr( 'th' )[ : 1 ] + trs[0]( 'th' )[ 0 : 1 ] + tr( 'th' )[ 1 : ]
                # lr5c4 OK
                elif 'lr5c5' in url:
                    # first two elements of first row + first two elements of second row + fourth element of first row (index 3) + last two elements of second row
                    ths = trs[0]( 'th' )[ : 2 ] + tr( 'th' )[ : 2 ] + trs[0]( 'th' )[ 3 : 4 ] + tr( 'th' )[ 2 : ]
                elif 'lr5c7' in url:
                    # first two elements of first row + all elements of second row + last element of first row
                    ths = trs[0]( 'th' )[ : 2 ] + tr( 'th' ) + trs[0]( 'th' )[ -1 : ]
                # lr6g* OK
                else:
                    ths = tr( 'th' )#[ 1 : ] # Do not include calendar year


            # For each th in the rearranged row
            for thi in range( len( ths ) ):

                th = ths[ thi ]

                # If this is the last row
                if is_lastrow:

                    # Add 'colN' class to th
                    th[ 'class' ].append( 'col' + str( thi ) )

                    # Do not append Calendar year header
                    if thi == 0:
                        continue

                # Get colspan
                if th and th.get( 'colspan' ):
                    colspan = int( th[ 'colspan' ] ) // 2 + 1
                else:
                    colspan = 1

                # Append header text to header row colspan times
                header_row += [ getHeaderText( th ) ] * colspan


            header_rows.append( header_row )


        # Add rows to header Html
        for tr in trs:
            
            addRowToHtml( tr, 'header' )


        json_dict[ 'html' ][ 'header' ] += '</thead>'


        # Get floating point or integer value from text
        def getValue( text ):

            # I think if it has a ':' in it, it is years:months, so don't convert it from string (?)
            if ':' in text:
                return cleanup( text )

            # Remove all non-numeric symbols
            result = re.sub( '[^\d\.-]', '', text )

            try:
                # If text has a '.' in it, it is a float
                if '.' in text:
                    return float( result )

                # Else it is an int
                return int( result )

            except ValueError:
                return False


        def getTitle():
            if soup.small:
                tagline = " " + soup.small.text.replace("[","(").replace("]",")")
            else:
                tagline = ""

            if table.b:
                titleElement = table.b
            else:
                titleElement = soup( style='font-weight:bold' )[0]

            return getHeaderText( titleElement ).replace( u'\u2014', '-' ) + tagline


        def getTableName():

            return cleanup( '-'.join( getTitle().split( '-' )[ 1 : ] ) )


        def getTableId():

            id = cleanup( getTitle().split( '-' )[ 0 ].replace( 'Table', '' ) )

            # Replace . with _ and remove the extraneous . at the end
            id = id.replace( '.', '_' )[ : -1]
            
            # If there is more than one table
            if len( tables ) > 1:
                id = id + '-' + str( ti )

            return id


        def writeData():
            json_dict[ 'html' ][ 'body' ] += '</tbody>'

            id = json_dict[ 'title' ][ 'id' ]
            file_name = 'trustees_report-' + id + '.json'

            f = open( file_name, 'wb' )

            json.dump( json_dict, f )

            f.close()
            
            # For debugging
            json_dicts.append( copy.deepcopy( json_dict ) )


        # Start with subtable_num -1 (no subtables found)
        subtable_num = -1

        # If it is lr5c7, the first two rows are header rows
        if 'lr5c7' in url:
            trs = table.tbody( 'tr' )[ 2 : ]
        else:
            trs = table.tbody( 'tr' )

        pause_data = False

        # For each row in the table body
        for tr in trs:

            # Get td's (could be none)
            tds = tr( 'td' )

            # If it is a new subtable
            if tr.th:
            
                subtable_num = subtable_num + 1

                # If this is not the first subtable (or row was previously added without subtable)
                if subtable_num > 0 or added_row_without_subtable:

                    # If we previously added a row without a subtable
                    if added_row_without_subtable:

                        name = getTableName() # TODO: should this include a subtable name?

                        id = getTableId() + '-' + str( subtable_num )

                        # Increase subtable num
                        subtable_num = subtable_num + 1

                        json_dict[ 'title' ] = { 'name' : name, 'id' : id }

                    # Write the previous subtable data
                    writeData()

                # Clear all the previous series data and start a new body
                for key in json_dict[ 'data' ]:
                    json_dict[ 'data' ][ key ][ 'series' ] = []

                json_dict[ 'html' ][ 'body' ] = '<tbody>'

                # Replace title data with the new name and id
                subtable_name = getHeaderText( tr.th ).replace( ':', '' )

                name = getTableName()

                # Only append subtable name if data wasn't previously paused (this is basically for table lr5c7)
                if not pause_data:
                    name = name + ' :: ' + 'Subtable : ' + subtable_name

                id = getTableId() + '-' + str( subtable_num )

                json_dict[ 'title' ] = { 'name' : name, 'id' : id }

                # If this is lr5c7
                if 'lr5c7' in url:

                    # Adjust the header html
                    json_dict[ 'html' ][ 'header' ] = json_dict[ 'html' ][ 'header' ].replace( 'Benefits in 2015 dollars<span class="top_footnote top_a">a</span>with retirement at normal retirement age', 'Benefits in 2015 dollars<span class="top_footnote top_a">a</span>with retirement at age 65' )

                    # Fill in the first header row with the new header
                    header_rows[0] = [ None ] + [ subtable_name ] * 5

                # Unpause data
                pause_data = False


            # Otherwise it is a data row if it has more than 1 td
            elif len( tds ) > 1:

                if not pause_data:

                    # For each td
                    for tdi in range( int( math.ceil( len( tds ) / 2 ) ) ):

                        td = tds[ tdi * 2 ]

                        if not td.get( 'class' ):
                            td[ 'class' ] = []
                        td[ 'class' ].append( 'col' + str( tdi ) )

                        # Determine key, value, label, and type
                        if tdi == 0:

                            key = 'years'

                            value = getValue( td.text )

                            if 'lr5c7' in url:
                                label = 'Year attain age 65'
                            else:
                                label = 'Calendar year'

                            type = 'year'

                        else:

                            key = 'col' + str( tdi )

                            value = getValue( td.text )
                            
                            label_list = []

                            for header_row in header_rows:

                                # If there is a corresponding, non-null element in the header row
                                if tdi - 1 < len( header_row ) and header_row[ tdi - 1 ]:

                                    label_list.append( header_row[ tdi - 1 ] )

                            label = ' :: '.join( label_list )
                            
                            type = getType( tdi )

                        # Add the key and series if they are not there already
                        if not json_dict[ 'data' ].get( key ):
                            json_dict[ 'data' ][ key ] = {}
                            json_dict[ 'data' ][ key ][ 'series' ] = []

                        # Add the td value to the data series
                        json_dict[ 'data' ][ key ][ 'series' ].append( value ) # multiply tdi by 2 because every other col is a nbsp

                        json_dict[ 'data' ][ key ][ 'label' ] = label

                        json_dict[ 'data' ][ key ][ 'type' ] = type

                # Add row to body Html
                addRowToHtml( tr, 'body' )


            # If it is neither a new subtable or a data row
            else:

                # Pause data collection (until the next subtable header is encountered)
                pause_data = True


        # If we get through every line without finding a subtable
        if subtable_num == -1:

            name = getTableName()

            id = getTableId()

            json_dict[ 'title' ] = { 'name' : name, 'id' : id }


        # Write the last subtable data
        writeData()


# For debugging
def checkData( json_dict ):
    print len( json_dicts ), 'tables'
    print
    print json_dict[ 'title' ]['id'], json_dict[ 'title' ]['name']
    print
    for k, v in json_dict[ 'data' ].iteritems():
        print k, v[ 'label' ], v[ 'series' ][0], v[ 'type' ]
    print
    print len( json_dict[ 'footnotes' ] ), 'footnotes'
