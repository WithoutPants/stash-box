package models

import (
	"database/sql"
	"fmt"
	"reflect"

	"github.com/stashapp/stashdb/pkg/database"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

// TODO - I think this belongs in database

type Table struct {
	name        string
	newObjectFn func() interface{}
}

func (t Table) Name() string {
	return t.name
}

func (t Table) NewObject() interface{} {
	return t.newObjectFn()
}

func NewTable(name string, newObjectFn func() interface{}) Table {
	return Table{
		name:        name,
		newObjectFn: newObjectFn,
	}
}

type TableJoin struct {
	Table
	primaryTable string
	joinColumn   string
}

func NewTableJoin(primaryTable string, joinTable string, joinColumn string, newObjectFn func() interface{}) TableJoin {
	return TableJoin{
		Table: Table{
			name:        joinTable,
			newObjectFn: newObjectFn,
		},
		primaryTable: primaryTable,
		joinColumn:   joinColumn,
	}
}

func (t TableJoin) Inverse(joinColumn string) TableJoin {
	return TableJoin{
		Table: Table{
			name:        t.primaryTable,
			newObjectFn: t.newObjectFn,
		},
		primaryTable: t.Name(),
		joinColumn:   joinColumn,
	}
}

type Model interface {
	GetTable() Table
	GetID() int64
}

type Models interface {
	Add(interface{})
}

type Joins interface {
	Each(func(interface{}))
	Add(interface{})
}

type DBI interface {
	Insert(model Model) (interface{}, error)
	InsertJoin(tableJoin TableJoin, object interface{}) error
	InsertJoins(tableJoin TableJoin, joins Joins) error

	Update(model Model) (interface{}, error)
	ReplaceJoins(tableJoin TableJoin, id int64, objects Joins) error

	Delete(id int64, table Table) error
	DeleteJoins(tableJoin TableJoin, id int64) error

	Find(id int64, table Table) (interface{}, error)
	FindJoins(tableJoin TableJoin, id int64, output Joins) error
	RawQuery(table Table, query string, args []interface{}, output Models) error
}

type dbi struct {
	tx *sqlx.Tx
}

func DBIWithTxn(tx *sqlx.Tx) DBI {
	return &dbi{
		tx: tx,
	}
}

func DBINoTxn() DBI {
	return &dbi{}
}

func (q dbi) Insert(model Model) (interface{}, error) {
	tableName := model.GetTable().Name()
	id, err := insertObject(q.tx, tableName, model)

	if err != nil {
		return nil, errors.Wrap(err, fmt.Sprintf("Error creating %s", reflect.TypeOf(model).Name()))
	}

	// don't want to modify the existing object
	newModel := model.GetTable().NewObject()
	if err := getByID(q.tx, tableName, id, newModel); err != nil {
		return nil, errors.Wrap(err, fmt.Sprintf("Error getting %s after create", reflect.TypeOf(model).Name()))
	}

	return newModel, nil
}

func (q dbi) Update(model Model) (interface{}, error) {
	tableName := model.GetTable().Name()
	err := updateObjectByID(q.tx, tableName, model)

	if err != nil {
		return nil, errors.Wrap(err, fmt.Sprintf("Error updating %s", reflect.TypeOf(model).Name()))
	}

	// don't want to modify the existing object
	updatedModel := model.GetTable().NewObject()
	if err := getByID(q.tx, tableName, model.GetID(), updatedModel); err != nil {
		return nil, errors.Wrap(err, fmt.Sprintf("Error getting %s after update", reflect.TypeOf(model).Name()))
	}

	return updatedModel, nil
}

func (q dbi) Delete(id int64, table Table) error {
	o, err := q.Find(id, table)

	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("Error deleting from %s", table.Name()))
	}

	if o == nil {
		return fmt.Errorf("Row with id %d not found in %s", id, table.Name())
	}

	return executeDeleteQuery(table.Name(), id, q.tx)
}

func selectStatement(table Table) string {
	tableName := table.Name()
	return fmt.Sprintf("SELECT %s.* FROM %s", tableName, tableName)
}

func (q dbi) Find(id int64, table Table) (interface{}, error) {
	query := selectStatement(table) + " WHERE id = ? LIMIT 1"
	args := []interface{}{id}

	var rows *sqlx.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.Queryx(query, args...)
	} else {
		rows, err = database.DB.Queryx(query, args...)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	defer rows.Close()

	output := table.NewObject()
	if rows.Next() {
		if err := rows.StructScan(output); err != nil {
			return nil, err
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return output, nil
}

func (q dbi) InsertJoin(tableJoin TableJoin, object interface{}) error {
	_, err := insertObject(q.tx, tableJoin.Name(), object)

	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("Error creating %s", reflect.TypeOf(object).Name()))
	}

	return nil
}

func (q dbi) InsertJoins(tableJoin TableJoin, joins Joins) error {
	var err error
	joins.Each(func(ro interface{}) {
		if err != nil {
			return
		}

		err = q.InsertJoin(tableJoin, ro)
	})

	return err
}

func (q dbi) ReplaceJoins(tableJoin TableJoin, id int64, joins Joins) error {
	err := q.DeleteJoins(tableJoin, id)

	if err != nil {
		return err
	}

	return q.InsertJoins(tableJoin, joins)
}

func (q dbi) DeleteJoins(tableJoin TableJoin, id int64) error {
	return deleteObjectsByColumn(q.tx, tableJoin.Name(), tableJoin.joinColumn, id)
}

func (q dbi) FindJoins(tableJoin TableJoin, id int64, output Joins) error {
	query := selectStatement(tableJoin.Table) + " WHERE " + tableJoin.joinColumn + " = ?"
	args := []interface{}{id}

	return q.RawQuery(tableJoin.Table, query, args, output)
}

func (q dbi) RawQuery(table Table, query string, args []interface{}, output Models) error {
	var rows *sqlx.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.Queryx(query, args...)
	} else {
		rows, err = database.DB.Queryx(query, args...)
	}

	if err != nil && err != sql.ErrNoRows {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		o := table.NewObject()
		if err := rows.StructScan(output); err != nil {
			return err
		}

		output.Add(o)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}
