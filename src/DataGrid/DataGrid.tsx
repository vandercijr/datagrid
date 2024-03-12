import styles from './DataGrid.module.css'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DataGridColumn from './DataGridColumn'

const getFieldValue = (source: any, field: string) => {
  const fields = field.split('.')
  return fields.reduce((acc: any, f: any) => (acc ? acc[f] : source[f]), null)
}

interface DataGridProps {
  getRowId?: (params: any) => void
  dataRows: any[]
  columnsDef: any
  components: any
  disableFlash?: boolean
  onReady?: (params: any) => void
  onDataRowsChange?: (params: any) => void
  onCellClicked?: (params: any) => void
  [key: string]: any
}

const DataGrid: FC<DataGridProps> = ({
  getRowId,
  dataRows,
  columnsDef,
  components,
  disableFlash = false,
  onReady,
  onDataRowsChange,
  onCellClicked,
  ...rest
}) => {
  const gridRef = useRef<any>(null)
  const [elementIndex, setElementIndex] = useState<number>(-1)
  const targetRef = useRef<any | null>(null)
  const _id = useRef() //useId()
  const _getRowId = useCallback(
    (row: any) => {
      if (typeof getRowId === 'function') {
        return getRowId({ data: row })
      }
    },
    [getRowId]
  )

  const [keyedDataRows, setKeyedDataRows] = useState<any>(dataRows)
  const [previousData, setPreviousData] = useState<any>()

  const currentData = useRef<any>([])

  useEffect(() => {
    setKeyedDataRows(
      (dataRows ?? []).map((row: any) => {
        return {
          [_id.current as any]: _getRowId({ data: row }),
          ...row
        }
      })
    )
  }, [dataRows, _id, _getRowId])

  useEffect(() => {
    if (!disableFlash) {
      setPreviousData(
        currentData.current.map((row: any) => {
          return {
            [_id.current as any]: _getRowId({ data: row }),
            id: row.id,
            ...columnsDef.reduce((acc: any, c: any) => {
              return { ...acc, [c.field]: getFieldValue(row, c.field) }
            }, {})
          }
        })
      )

      currentData.current = dataRows.map(row => {
        return { [_id.current as any]: _getRowId({ data: row }), ...row }
      })
    }
  }, [dataRows, columnsDef, _id, _getRowId, disableFlash])

  const api = useMemo(
    () => ({
      events: [] as any,
      rows: [] as any,
      scrollToIndex: (index: number) => {
        setElementIndex(index)
      },
      addEventListener: (eventName: string, callback: any) => {
        if (!api.events.find((e: any) => e.eventName === eventName)) {
          api.events.push({ eventName, callback })
        }
      },
      dispatchEvent: (eventName: string, params: any) => {
        const event: any = api.events.find(
          (e: any) => e.eventName === eventName
        )
        if (event) {
          if (typeof event.callback === 'function') {
            event.callback(params)
          }
        }
      },
      removeEventListener: (eventName: string) => {
        api.events = api.events.filter((e: any) => e.eventName !== eventName)
        return true
      },
      removeEventListeners: () => {
        api.events = []
        return true
      }
    }),
    []
  )

  useEffect(() => {
    if (targetRef.current && gridRef.current && elementIndex > -1) {
      const gridBounds = gridRef.current.getBoundingClientRect()
      const targetBounds = targetRef.current.getBoundingClientRect()
      if (gridRef.current) {
        gridRef.current.scrollTo(0, 0)
        const gridOffset = (gridBounds.top + gridBounds.bottom) / 2
        if (targetBounds.top > gridBounds.height) {
          gridRef.current.scroll(0, targetBounds.top - gridOffset)
        }
      }
    }
  }, [elementIndex])

  useEffect(() => {
    if (typeof onReady === 'function') {
      onReady({ api })
    }
    return () => {
      api.removeEventListeners()
    }
  }, [onReady, api])

  useEffect(() => {
    if (api) {
      if (dataRows?.length) {
        api.rows = dataRows
        api.dispatchEvent('onDataRowsChange', { data: dataRows })
        if (typeof onDataRowsChange === 'function') {
          onDataRowsChange({ api, data: dataRows })
        }
      }
    }
  }, [dataRows]) //eslint-disable-line

  return keyedDataRows?.length && columnsDef ? (
    <div
      ref={gridRef}
      className={`${styles.grid} ${styles.fixedHeader}`}
      {...rest}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columnsDef.map((c: any, i: number) => {
              const template = c?.headerComponents?.template
              return (
                <th key={`${c.headerName}${i}`}>
                  {template ? template : c.headerName ?? 'none'}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody
          ref={eRef => {
            if (eRef) {
              eRef.childNodes.forEach((n: any, i: number) => {
                if (i === elementIndex) {
                  targetRef.current = n
                }
              })
            }
          }}>
          {(keyedDataRows ?? []).map((row: any, i: number) => {
            const _rowId =
              typeof getRowId === 'function' ? getRowId({ data: row }) : row.id
            return (
              <tr key={`${_rowId}`}>
                {columnsDef.map((c: any, j: number) => {
                  const CustomComponent = c.cellRenderer
                    ? components[c.cellRenderer]
                    : null
                  const _value = getFieldValue(row, c.field)
                  const _key = row[_rowId] ? _rowId : 'id'
                  let shouldFlash = false
                  if (previousData) {
                    if (previousData[i]) {
                      if (previousData[i][_key] === row[_key]) {
                        shouldFlash = _value !== previousData[i][c.field]
                      }
                    }
                  }
                  return (
                    <DataGridColumn
                      flash={shouldFlash}
                      key={`${row.id}${c.headerName}${j}`}
                      className={
                        typeof c.cellClass === 'function'
                          ? c.cellClass({ data: row })
                          : ''
                      }
                      onClick={() => {
                        if (typeof onCellClicked === 'function') {
                          onCellClicked({
                            data: row,
                            value: _value,
                            columnDef: c
                          })
                        }
                      }}>
                      {CustomComponent ? (
                        <CustomComponent
                          data={row}
                          value={_value}
                          columnDef={c}
                        />
                      ) : typeof c.valueFormatter === 'function' ? (
                        c.valueFormatter({
                          data: row,
                          columnsDef: c,
                          value: _value
                        })
                      ) : (
                        _value
                      )}
                    </DataGridColumn>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  ) : null
}

export default DataGrid
