import { FC, useEffect, useRef } from 'react'
import styles from './DataGrid.module.css'

interface DataGridColumnProps {
  flash: boolean
  children: any
  [key: string]: any
}

export const DataGridColumn: FC<DataGridColumnProps> = ({
  flash = false,
  children,
  ...rest
}) => {
  const ref = useRef<any>('')

  useEffect(() => {
    let isMounted = true
    if (flash) {
      ref.current.classList.remove(styles.flash)
      setTimeout(() => {
        if (isMounted) {
          ref.current.classList.add(styles.flash)
          setTimeout(() => {
            if (isMounted) {
              ref.current.classList.remove(styles.flash)
            }
          }, 1000)
        }
      }, 10)
    }
    return () => {
      isMounted = false
    }
  }, [flash])

  return (
    <td ref={ref} {...rest}>
      {children}
    </td>
  )
}

export default DataGridColumn
